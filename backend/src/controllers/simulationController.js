const db = require("../config/database");

const INCIDENT_DEVICE_MAP = {
  chay: null, // Tất cả thiết bị tắt
  mat_dien: null, // Tất cả thiết bị tắt
  may_chieu_hong: "may_chieu",
  dieu_hoa_hong: "dieu_hoa",
  mat_internet: null,
  qua_tai: null,
};

const simulationController = {
  // Kích hoạt sự cố
  triggerIncident: async (req, res) => {
    try {
      const { room_id, type, severity, description } = req.body;

      // Tạo sự cố
      const [result] = await db.query(
        `
        INSERT INTO Incidents (room_id, type, description, severity, triggered_by, simulated, status)
        VALUES (?, ?, ?, ?, ?, TRUE, 'dang_xay_ra')
      `,
        [
          room_id,
          type,
          description || `Mô phỏng sự cố: ${type}`,
          severity || "trung",
          req.user.id,
        ],
      );

      const incidentId = result.insertId;

      // Cập nhật trạng thái phòng
      await db.query("UPDATE Rooms SET status = ? WHERE id = ?", [
        "su_co",
        room_id,
      ]);

      // Xử lý thiết bị theo loại sự cố
      if (type === "chay" || type === "mat_dien") {
        // Tắt tất cả thiết bị
        await db.query("UPDATE Devices SET status = ? WHERE room_id = ?", [
          "tat",
          room_id,
        ]);
      } else if (type === "may_chieu_hong") {
        await db.query(
          `
          UPDATE Devices SET status = 'hong'
          WHERE room_id = ? AND device_type_id = (SELECT id FROM DeviceTypes WHERE name = 'may_chieu')
        `,
          [room_id],
        );
      } else if (type === "dieu_hoa_hong") {
        await db.query(
          `
          UPDATE Devices SET status = 'hong'
          WHERE room_id = ? AND device_type_id = (SELECT id FROM DeviceTypes WHERE name = 'dieu_hoa')
        `,
          [room_id],
        );
      }

      // Tạo thông báo
      await db.query(
        `
        INSERT INTO Notifications (user_id, content, type, severity)
        SELECT id, ?, 'su_co', ?
        FROM Users WHERE role_id = 1
      `,
        [
          `⚠️ Sự cố ${type} tại phòng (ID: ${room_id})`,
          severity === "nghiem_trong" ? "critical" : "warning",
        ],
      );

      // Ghi log
      await db.query(
        `
        INSERT INTO ActivityLogs (user_id, action, entity_type, entity_id, details)
        VALUES (?, 'SIMULATE_INCIDENT', 'Incident', ?, ?)
      `,
        [req.user.id, incidentId, JSON.stringify({ room_id, type, severity })],
      );

      // Gửi socket realtime
      const io = req.app.get("io");
      io.emit("incident_simulated", {
        incidentId,
        roomId: room_id,
        type,
        severity,
      });

      res.status(201).json({
        message: "Mô phỏng sự cố thành công",
        incidentId,
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Giải quyết sự cố
  resolveIncident: async (req, res) => {
    try {
      const { incident_id, room_id } = req.body;

      // Cập nhật sự cố
      await db.query(
        `
        UPDATE Incidents SET status = 'da_giai_quyet', resolved_at = NOW()
        WHERE id = ?
      `,
        [incident_id],
      );

      // Phòng về trạng thái trống
      await db.query("UPDATE Rooms SET status = ? WHERE id = ?", [
        "trong",
        room_id,
      ]);

      // Thiết bị về trạng thái bình thường
      await db.query(
        `
        UPDATE Devices SET status = 'hoat_dong'
        WHERE room_id = ? AND status = 'tat'
      `,
        [room_id],
      );

      // Gửi socket
      const io = req.app.get("io");
      io.emit("incident_resolved", {
        incidentId: incident_id,
        roomId: room_id,
      });

      res.json({ message: "Đã giải quyết sự cố" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lấy danh sách sự cố đang xảy ra
  getActive: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT i.*, r.code as room_code, r.name as room_name,
               f.floor_number, b.code as building_code, b.name as building_name
        FROM Incidents i
        JOIN Rooms r ON i.room_id = r.id
        JOIN Floors f ON r.floor_id = f.id
        JOIN Buildings b ON f.building_id = b.id
        WHERE i.status != 'da_giai_quyet'
        ORDER BY i.occurred_at DESC
      `);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Mô phỏng ngẫu nhiên
  randomSimulate: async (req, res) => {
    try {
      const types = [
        "chay",
        "mat_dien",
        "may_chieu_hong",
        "dieu_hoa_hong",
        "mat_internet",
        "qua_tai",
      ];
      const severities = ["thap", "trung", "cao", "nghiem_trong"];

      // Lấy phòng ngẫu nhiên
      const [rooms] = await db.query(
        'SELECT id, code FROM Rooms WHERE status = "trong" ORDER BY RAND() LIMIT 1',
      );
      if (rooms.length === 0) {
        return res
          .status(400)
          .json({ message: "Không có phòng trống để mô phỏng!" });
      }

      const room = rooms[0];
      const type = types[Math.floor(Math.random() * types.length)];
      const severity =
        severities[Math.floor(Math.random() * severities.length)];

      req.body = { room_id: room.id, type, severity };
      return simulationController.triggerIncident(req, res);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = simulationController;
