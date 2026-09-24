const db = require("../config/database");

// === Generators dữ liệu mô phỏng ===

const generateDailyData = () => {
  const hours = ["00:00","02:00","04:00","06:00","08:00","10:00",
                 "12:00","14:00","16:00","18:00","20:00","22:00"];
  const base  = [12, 8, 6, 15, 45, 68, 72, 80, 75, 55, 35, 20];
  return hours.map((time, i) => {
    const kwh = parseFloat((base[i] * (0.85 + Math.random() * 0.3)).toFixed(1));
    return { time, kwh, cost: Math.round(kwh * 2) };
  });
};

const generateWeeklyData = () => {
  const days = ["T2","T3","T4","T5","T6","T7","CN"];
  const baseA = [180,220,195,240,210,120,80];
  const baseB = [150,180,160,200,175,90,60];
  return days.map((date, i) => ({
    date,
    toaA: Math.round(baseA[i] * (0.9 + Math.random() * 0.2)),
    toaB: Math.round(baseB[i] * (0.9 + Math.random() * 0.2)),
  }));
};

const generateMonthlyData = () => {
  const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
  const base   = [3200,2800,3500,3100,3800,4200,3900,4100,3700,3400,3600,4400];
  const currentMonth = new Date().getMonth(); // 0-indexed
  return months.slice(0, currentMonth + 1).map((month, i) => ({
    month,
    kwh:  Math.round(base[i] * (0.9 + Math.random() * 0.2)),
    cost: Math.round(base[i] * 2 * (0.9 + Math.random() * 0.2)),
  }));
};

// ============================================================

const energyController = {
  // KPI tổng quan — tính từ số thiết bị đang hoạt động
  getSummary: async (req, res) => {
    try {
      const [deviceRows] = await db.query(
        "SELECT COUNT(*) as count FROM devices WHERE status = 'hoat_dong'"
      );
      const activeDevices = deviceRows[0].count;
      const hoursToday   = new Date().getHours() || 1;

      // Mô phỏng: ~0.5 kWh/thiết bị/giờ
      const todayKwh  = parseFloat((activeDevices * 0.5 * hoursToday * (0.7 + Math.random() * 0.3)).toFixed(1));
      const weeklyKwh = parseFloat((todayKwh * 5.2 * (0.9 + Math.random() * 0.2)).toFixed(1));
      const todayCost = Math.round(todayKwh * 2000); // 2,000 VNĐ/kWh

      res.json({
        today_kwh:      todayKwh,
        today_cost:     todayCost,
        weekly_kwh:     weeklyKwh,
        alerts_count:   Math.floor(Math.random() * 5) + 1,
        active_devices: activeDevices,
      });
    } catch (error) {
      console.error("Lỗi getSummary:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Dữ liệu biểu đồ theo kỳ — hoàn toàn mô phỏng
  getChart: async (req, res) => {
    try {
      const { period = "day" } = req.query;
      let data;
      if (period === "week")       data = generateWeeklyData();
      else if (period === "month") data = generateMonthlyData();
      else                         data = generateDailyData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Phân bổ điện năng theo loại thiết bị — tính từ bảng devices thực tế
  getDeviceBreakdown: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT dt.name, COUNT(d.id) as device_count
        FROM devices d
        JOIN devicetypes dt ON d.device_type_id = dt.id
        WHERE d.status = 'hoat_dong'
        GROUP BY dt.id, dt.name
        ORDER BY device_count DESC
      `);

      // kWh/thiết bị/ngày theo loại (mô phỏng)
      const kwhMap   = { dieu_hoa:3.5, den:0.8, may_chieu:1.2, quat:0.4, loa:0.2, may_tinh:1.5 };
      const colorMap = { dieu_hoa:"#3b82f6", den:"#eab308", may_chieu:"#8b5cf6",
                         quat:"#22c55e", loa:"#f97316", may_tinh:"#06b6d4" };
      const labelMap = { dieu_hoa:"Điều hòa", den:"Chiếu sáng", may_chieu:"Máy chiếu",
                         quat:"Quạt", loa:"Loa", may_tinh:"Máy tính" };

      const totalKwh = rows.reduce(
        (sum, r) => sum + (kwhMap[r.name] || 1) * r.device_count, 0
      );

      const breakdown = rows.map((r) => {
        const kwh = parseFloat(((kwhMap[r.name] || 1) * r.device_count).toFixed(1));
        return {
          name:         labelMap[r.name] || r.name,
          code:         r.name,
          device_count: r.device_count,
          kwh,
          value:        parseFloat(((kwh / totalKwh) * 100).toFixed(1)),
          color:        colorMap[r.name] || "#6b7280",
        };
      });

      res.json(breakdown);
    } catch (error) {
      console.error("Lỗi getDeviceBreakdown:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Top phòng tiêu thụ cao — tính theo số thiết bị đang hoạt động
  getTopRooms: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT r.code as room, r.name as room_name, COUNT(d.id) as device_count
        FROM rooms r
        JOIN devices d ON r.id = d.room_id
        WHERE d.status = 'hoat_dong'
        GROUP BY r.id, r.code, r.name
        ORDER BY device_count DESC
        LIMIT 5
      `);

      const topRooms = rows
        .map((r) => ({
          room:      r.room,
          room_name: r.room_name,
          kwh:       parseFloat((r.device_count * 1.2 * (0.9 + Math.random() * 0.3)).toFixed(1)),
          trend:     Math.random() > 0.5 ? "up" : "down",
        }))
        .sort((a, b) => b.kwh - a.kwh);

      res.json(topRooms);
    } catch (error) {
      console.error("Lỗi getTopRooms:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = energyController;
