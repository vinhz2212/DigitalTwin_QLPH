const SensorModel = require("../models/sensorModel");
const db = require("../config/database");

// Cấu hình loại cảm biến theo enum trong DB
const SENSOR_TYPES = [
  { type: "nhiet_do",  unit: "°C",    min: 20, max: 33, threshold_min: 20, threshold_max: 30 },
  { type: "do_am",     unit: "%",     min: 40, max: 75, threshold_min: 40, threshold_max: 70 },
  { type: "co2",       unit: "ppm",   min: 300, max: 1500, threshold_min: 300, threshold_max: 1000 },
  { type: "so_nguoi",  unit: "người", min: 0,  max: 45, threshold_min: 0,   threshold_max: 40 },
  { type: "anh_sang",  unit: "lux",   min: 100, max: 900, threshold_min: 300, threshold_max: 800 },
  { type: "khoi",      unit: "ppm",   min: 0,  max: 25, threshold_min: 0,   threshold_max: 20 },
];

// Sinh giá trị ngẫu nhiên theo range
const randVal = (min, max, dec = 1) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(dec));

// Sinh đọc cảm biến mô phỏng cho 1 phòng (trả về object theo type)
const generateRoomReading = (roomId) => {
  const result = {};
  SENSOR_TYPES.forEach(({ type, unit, min, max, threshold_min, threshold_max }) => {
    const value = type === "co2" || type === "so_nguoi"
      ? randVal(min, max, 0)
      : randVal(min, max, 1);
    result[type] = {
      value,
      unit,
      is_alert: value > threshold_max || value < threshold_min,
      threshold_min,
      threshold_max,
    };
  });
  return result;
};

const sensorController = {
  // Lấy dữ liệu cảm biến mô phỏng tất cả phòng
  getAll: async (req, res) => {
    try {
      const rooms = await SensorModel.getRoomList();

      const data = rooms.map((room) => ({
        ...room,
        sensors: generateRoomReading(room.id),
        recorded_at: new Date().toISOString(),
      }));

      res.json(data);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu cảm biến:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lấy dữ liệu cảm biến mô phỏng của 1 phòng cụ thể
  getByRoom: async (req, res) => {
    try {
      const { roomId } = req.params;
      res.json({
        room_id: parseInt(roomId),
        sensors: generateRoomReading(parseInt(roomId)),
        recorded_at: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lịch sử 24h mô phỏng của 1 loại cảm biến
  getHistory: async (req, res) => {
    try {
      const { roomId } = req.params;
      const { type = "nhiet_do" } = req.query;

      const config = SENSOR_TYPES.find((s) => s.type === type) || SENSOR_TYPES[0];
      const now = new Date();

      const history = Array.from({ length: 24 }, (_, i) => {
        const t = new Date(now);
        t.setHours(t.getHours() - (23 - i));
        const dec = type === "co2" || type === "so_nguoi" ? 0 : 1;
        const value = randVal(config.min, config.max, dec);
        return {
          time: `${String(t.getHours()).padStart(2, "0")}:00`,
          value,
          unit: config.unit,
          is_alert: value > config.threshold_max || value < config.threshold_min,
          recorded_at: t.toISOString(),
        };
      });

      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lưu snapshot vào DB (insert từng type vào bảng sensors)
  saveSnapshot: async (req, res) => {
    try {
      const [rooms] = await db.query("SELECT id FROM rooms LIMIT 40");

      const inserts = [];
      for (const room of rooms) {
        for (const cfg of SENSOR_TYPES) {
          const dec = cfg.type === "co2" || cfg.type === "so_nguoi" ? 0 : 1;
          const value = randVal(cfg.min, cfg.max, dec);
          inserts.push([
            room.id,
            cfg.type,
            value,
            cfg.unit,
            value > cfg.threshold_max || value < cfg.threshold_min,
            cfg.threshold_min,
            cfg.threshold_max,
          ]);
        }
      }

      await db.query(
        `INSERT INTO sensors 
         (room_id, type, value, unit, is_alert, threshold_min, threshold_max)
         VALUES ?`,
        [inserts],
      );

      const io = req.app.get("io");
      if (io) io.emit("sensor_snapshot", { timestamp: new Date(), count: inserts.length });

      res.json({ message: "Đã lưu snapshot cảm biến", count: inserts.length });
    } catch (error) {
      console.error("Lỗi lưu snapshot:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = sensorController;
