const { generateContent } = require("../config/gemini");
const db = require("../config/database");

const aiController = {
  chat: async (req, res) => {
    try {
      const { message, history = [] } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Vui lòng nhập câu hỏi" });
      }

      // Lọc bỏ tin nhắn lỗi trong history
      const cleanedHistory = history.filter(
        (h) =>
          h.content &&
          !h.content.includes("❌ Xin lỗi") &&
          !h.content.includes("Cần cấu hình Gemini"),
      );

      const [roomStats] = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(status = 'trong') as available,
          SUM(status = 'dang_hoc') as occupied,
          SUM(status = 'bao_tri') as maintenance,
          SUM(status = 'su_co') as incident
        FROM Rooms
      `);

      const [deviceStats] = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(status = 'hoat_dong') as active,
          SUM(status = 'hong') as broken
        FROM Devices
      `);

      const [incidentStats] = await db.query(`
        SELECT COUNT(*) as active
        FROM Incidents
        WHERE status = 'dang_xay_ra'
      `);

      const systemContext = `
Thông tin hiện tại của hệ thống:
- Phòng học: ${roomStats[0].total} tổng, ${roomStats[0].available} trống, ${roomStats[0].occupied} đang học, ${roomStats[0].maintenance} bảo trì, ${roomStats[0].incident} sự cố
- Thiết bị: ${deviceStats[0].total} tổng, ${deviceStats[0].active} hoạt động, ${deviceStats[0].broken} hỏng
- Sự cố đang xảy ra: ${incidentStats[0].active}
      `;

      const fullMessage = systemContext + "\n\nCâu hỏi: " + message;
      const response = await generateContent(fullMessage);

      await db.query(
        `INSERT INTO AIAnalysis (user_id, prompt, response, type) VALUES (?, ?, ?, 'chatbot')`,
        [req.user.id, message, response],
      );

      res.json({ response });
    } catch (error) {
      console.error("Gemini error:", error);
      res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
  },

  analyzeIncident: async (req, res) => {
    try {
      const { incident_type, description, room_code } = req.body;

      const prompt = `
Phân tích sự cố tại phòng ${room_code}:
- Loại sự cố: ${incident_type}
- Mô tả: ${description}

Hãy đưa ra:
1. Nguyên nhân có thể
2. Mức độ nguy hiểm
3. Các bước xử lý ngay lập tức
4. Biện pháp phòng ngừa
      `;

      const response = await generateContent(prompt);

      await db.query(
        `INSERT INTO AIAnalysis (user_id, prompt, response, type) VALUES (?, ?, ?, 'phan_tich_su_co')`,
        [req.user.id, prompt, response],
      );

      res.json({ response });
    } catch (error) {
      console.error("Gemini error:", error);
      res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
  },

  suggestMaintenance: async (req, res) => {
    try {
      const { device_name, device_type, last_maintenance, issue } = req.body;

      const prompt = `
Đề xuất bảo trì cho thiết bị:
- Tên thiết bị: ${device_name}
- Loại: ${device_type}
- Lần bảo trì gần nhất: ${last_maintenance || "Chưa có"}
- Vấn đề hiện tại: ${issue}

Hãy đưa ra:
1. Đánh giá tình trạng thiết bị
2. Các bước bảo trì cần thực hiện
3. Thời gian bảo trì dự kiến
4. Lịch bảo trì định kỳ đề xuất
      `;

      const response = await generateContent(prompt);

      await db.query(
        `INSERT INTO AIAnalysis (user_id, prompt, response, type) VALUES (?, ?, ?, 'de_xuat_bao_tri')`,
        [req.user.id, prompt, response],
      );

      res.json({ response });
    } catch (error) {
      console.error("Gemini error:", error);
      res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
  },

  findRoom: async (req, res) => {
    try {
      const { capacity, type, time, date } = req.body;

      const [availableRooms] = await db.query(
        `
        SELECT r.*, f.floor_number, b.code as building_code
        FROM Rooms r
        JOIN Floors f ON r.floor_id = f.id
        JOIN Buildings b ON f.building_id = b.id
        WHERE r.status = 'trong'
        AND r.capacity >= ?
        ${type ? "AND r.type = ?" : ""}
        ORDER BY r.capacity ASC
        LIMIT 5
        `,
        type ? [capacity, type] : [capacity],
      );

      const prompt = `
Tìm phòng học phù hợp:
- Sức chứa cần: ${capacity} người
- Loại phòng: ${type || "Bất kỳ"}
- Thời gian: ${time || "Không xác định"}
- Ngày: ${date || "Không xác định"}

Danh sách phòng trống phù hợp:
${availableRooms.map((r) => `- ${r.code} (${r.building_code}, Tầng ${r.floor_number}, ${r.capacity} chỗ)`).join("\n")}

Hãy đề xuất phòng phù hợp nhất và lý do.
      `;

      const response = await generateContent(prompt);

      res.json({ response, rooms: availableRooms });
    } catch (error) {
      console.error("Gemini error:", error);
      res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
  },
};

module.exports = aiController;
