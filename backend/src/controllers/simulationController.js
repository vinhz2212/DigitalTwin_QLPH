const db = require("../config/database");
const { notifyIncident } = require("../utils/incidentNotifications");
const {
  syncRoomOperationalStatus,
  restoreRoomPowerAfterResolvedIncident,
} = require("../services/roomOperationalStatusService");
const {
  FAILURE_DEVICE_TYPES,
  isolateFailedDevice,
  getFailureDevice,
  restoreRepairedDevice,
} = require("../services/devicePowerService");

const INCIDENT_DEVICE_MAP = {
  chay: null,
  mat_dien: null, // Tất cả thiết bị tắt
  may_chieu_hong: "may_chieu",
  dieu_hoa_hong: "dieu_hoa",
  mat_internet: null,
  qua_tai: null,
};

const simulationController = {
  // Kích hoạt sự cố
  triggerIncident: async (req, res) => {
    let connection;
    try {
      const { room_id, type, severity, description } = req.body;
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Lỗi thiết bị chỉ cô lập đúng máy chiếu/điều hòa trong phòng.
      let affectedDevice = null;
      if (FAILURE_DEVICE_TYPES[type]) {
        affectedDevice = await isolateFailedDevice(room_id, type, connection);
      }

      // Tạo sự cố
      const [result] = await connection.query(
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

      await syncRoomOperationalStatus(room_id, connection);

      // Xử lý thiết bị theo loại sự cố
      if (type === "mat_dien") {
        // Mất điện tắt thiết bị ngay; sự cố cháy chỉ tắt khi có lệnh ngắt điện.
        // Nhớ trạng thái ban đầu một lần để khôi phục sau sự cố cuối cùng.
        await connection.query(
          "UPDATE Rooms SET power_status = 'ngat_dien' WHERE id = ?",
          [room_id],
        );
        await connection.query(
          `UPDATE Devices
           SET power_cut_previous_status = COALESCE(power_cut_previous_status, status),
               status = 'tat'
           WHERE room_id = ?`,
          [room_id],
        );
      }
      await connection.commit();

      // Lưu thông báo cho quản trị viên và kỹ thuật viên, kèm mã phòng.
      const io = req.app.get("io");
      try {
        await notifyIncident({
          io,
          roomId: room_id,
          type,
          severity: severity || "trung",
          description: description || `Mô phỏng sự cố: ${type}`,
        });
      } catch (notificationError) {
        console.error("Không thể tạo cảnh báo mô phỏng:", notificationError);
      }

      // Gửi socket realtime
      if (io) {
        io.emit("incident_simulated", {
          incidentId,
          roomId: room_id,
          type,
          severity: severity || "trung",
        });
        if (type === "mat_dien") {
          io.emit("rooms_changed", { action: "power_status_changed", roomId: room_id });
        }
        if (type === "mat_dien" || affectedDevice) {
          io.emit("devices_changed", { roomId: room_id, deviceId: affectedDevice?.id });
        }
      }

      res.status(201).json({
        message: affectedDevice
          ? `Đã mô phỏng thiết bị hỏng và ngắt riêng nguồn ${affectedDevice.name}.`
          : "Mô phỏng sự cố thành công",
        incidentId,
      });
    } catch (error) {
      if (connection) await connection.rollback();
      res.status(error.status || 500).json({ message: error.status ? error.message : "Lỗi server", error: error.status ? undefined : error.message });
    } finally {
      connection?.release();
    }
  },

  // Giải quyết sự cố
  resolveIncident: async (req, res) => {
    let connection;
    try {
      const { incident_id } = req.body;
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [incidents] = await connection.query(
        "SELECT room_id, type, status FROM Incidents WHERE id = ? LIMIT 1 FOR UPDATE",
        [incident_id],
      );
      if (!incidents.length) {
        await connection.rollback();
        return res.status(404).json({ message: "Không tìm thấy sự cố." });
      }
      if (incidents[0].status === "da_giai_quyet") {
        await connection.rollback();
        return res.json({ message: "Sự cố đã được giải quyết trước đó." });
      }
      const roomId = incidents[0].room_id;
      const incidentType = incidents[0].type;

      // Cập nhật sự cố
      await connection.query(
        `
        UPDATE Incidents SET status = 'da_giai_quyet', resolved_at = NOW()
        WHERE id = ?
      `,
        [incident_id],
      );

      const restoration =
        ["chay", "mat_dien"].includes(incidentType) &&
        (await restoreRoomPowerAfterResolvedIncident(roomId, connection));
      let deviceRepair = null;
      if (FAILURE_DEVICE_TYPES[incidentType]) {
        const device = await getFailureDevice(roomId, incidentType, connection);
        deviceRepair = await restoreRepairedDevice(device.id, connection);
      }
      await syncRoomOperationalStatus(roomId, connection);
      await connection.commit();

      // Gửi socket
      const io = req.app.get("io");
      if (io) {
        io.emit("incident_resolved", {
          incidentId: incident_id,
          roomId,
        });
        io.emit("rooms_changed", {
          action: "incident_resolved",
          roomId,
        });
        if (restoration?.devicesRestored || deviceRepair?.restored) {
          io.emit("devices_changed", { roomId });
        }
      }

      res.json({
        message: deviceRepair?.restored
          ? "Đã sửa xong và cấp điện lại cho thiết bị mô phỏng."
          : deviceRepair?.blocked
            ? "Đã giải quyết sự cố; thiết bị vẫn ngắt điện vì còn sự cố hoặc phiếu bảo trì đang mở."
          : restoration?.powerRestored || restoration?.devicesRestored
          ? "Đã giải quyết sự cố, khôi phục nguồn điện và trạng thái thiết bị trước sự cố."
          : "Đã giải quyết sự cố",
      });
    } catch (error) {
      if (connection) await connection.rollback();
      res.status(500).json({ message: "Lỗi server", error: error.message });
    } finally {
      connection?.release();
    }
  },

  // Lấy danh sách sự cố đang xảy ra
  getActive: async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT i.*, r.code as room_code, r.name as room_name,
               r.power_status,
               CASE WHEN i.type IN ('may_chieu_hong', 'dieu_hoa_hong') THEN (
                 SELECT d.power_status
                 FROM Devices d
                 JOIN DeviceTypes dt ON dt.id = d.device_type_id
                 WHERE d.room_id = i.room_id
                   AND dt.name = CASE i.type
                     WHEN 'may_chieu_hong' THEN 'may_chieu'
                     ELSE 'dieu_hoa' END
                 LIMIT 1
               ) ELSE NULL END AS affected_device_power_status,
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
