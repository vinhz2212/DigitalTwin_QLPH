const db = require("../config/database");
const IncidentModel = require("../models/incidentModel");
const { notifyIncident } = require("../utils/incidentNotifications");
const {
  syncRoomOperationalStatus,
  restoreRoomPowerAfterResolvedIncident,
} = require("../services/roomOperationalStatusService");
const { createForUser } = require("../services/notificationService");
const {
  FAILURE_DEVICE_TYPES,
  getFailureDevice,
  restoreRepairedDevice,
} = require("../services/devicePowerService");
const {
  recordAutomaticResolutionAlert,
  emitAutomaticIncidentAlert,
} = require("../services/automaticIncidentAlertService");

const emitIncidentChange = (io, event, payload) => {
  if (!io) return;
  io.to("role:admin").emit(event, payload);
  io.to("role:ky_thuat_vien").emit(event, payload);
  io.emit("rooms_changed", {
    action: "incident",
    roomId: payload.roomId,
  });
};

const incidentController = {
  getAll: async (req, res) => {
    try {
      const incidents = await IncidentModel.getAll();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await IncidentModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const data = { ...req.body, triggered_by: req.user.id };
      const id = await IncidentModel.create(data);

      await syncRoomOperationalStatus(data.room_id);

      const incident = await IncidentModel.getById(id);
      const io = req.app.get("io");
      try {
        await notifyIncident({
          io,
          roomId: data.room_id,
          type: data.type,
          severity: data.severity || "trung",
          description: data.description,
          excludeUserId: req.user.id,
        });
      } catch (notificationError) {
        console.error("Không thể tạo cảnh báo sự cố:", notificationError);
      }

      try {
        await createForUser({
          io,
          userId: req.user.id,
          content: `Báo cáo sự cố tại phòng ${incident?.room_code || data.room_id} đã được ghi nhận.`,
          type: "su_co",
          severity: "info",
        });
      } catch (notificationError) {
        console.error("Không thể tạo thông báo sự cố:", notificationError);
      }

      emitIncidentChange(io, "incident_created", {
        incidentId: id,
        roomId: data.room_id,
      });

      res.status(201).json({ message: "Tạo sự cố thành công", incident });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    let connection;
    try {
      const { status } = req.body;
      if (!["dang_xay_ra", "dang_xu_ly", "da_giai_quyet"].includes(status)) {
        return res.status(400).json({ message: "Trạng thái sự cố không hợp lệ" });
      }
      connection = await db.getConnection();
      await connection.beginTransaction();
      const [incidents] = await connection.query(
        `SELECT i.room_id, i.type, i.status, r.code AS room_code
         FROM Incidents i JOIN Rooms r ON r.id = i.room_id
         WHERE i.id = ? FOR UPDATE`,
        [req.params.id],
      );
      const current = incidents[0];
      if (!current) {
        await connection.rollback();
        return res.status(404).json({ message: "Không tìm thấy sự cố" });
      }
      if (current.status === "da_giai_quyet" && status !== "da_giai_quyet") {
        await connection.rollback();
        return res.status(409).json({ message: "Sự cố đã giải quyết không thể mở lại." });
      }
      await connection.query(
        "UPDATE Incidents SET status = ?, resolved_at = CASE WHEN ? = 'da_giai_quyet' THEN NOW() ELSE NULL END WHERE id = ?",
        [status, status, req.params.id],
      );
      const restoration =
        status === "da_giai_quyet" &&
        ["chay", "mat_dien"].includes(current.type)
          ? await restoreRoomPowerAfterResolvedIncident(current.room_id, connection)
          : null;
      let deviceRepair = null;
      if (status === "da_giai_quyet" && current.status !== status && FAILURE_DEVICE_TYPES[current.type]) {
        const device = await getFailureDevice(current.room_id, current.type, connection);
        deviceRepair = await restoreRepairedDevice(device.id, connection);
      }
      await syncRoomOperationalStatus(current.room_id, connection);
      const resolutionAlert = status === "da_giai_quyet" && current.status !== status
        ? await recordAutomaticResolutionAlert({
            incidentId: req.params.id,
            roomId: current.room_id,
            roomCode: current.room_code,
            type: current.type,
            deviceId: deviceRepair?.device?.id,
            executor: connection,
          })
        : null;
      await connection.commit();

      const incident = await IncidentModel.getById(req.params.id);

      const io = req.app.get("io");
      emitAutomaticIncidentAlert(io, resolutionAlert);
      if (incident?.triggered_by && !resolutionAlert) {
        try {
          const statusLabels = {
            dang_xay_ra: "đang xảy ra",
            dang_xu_ly: "đang được xử lý",
            da_giai_quyet: "đã được giải quyết",
          };
          await createForUser({
            io,
            userId: incident.triggered_by,
            content: `Sự cố tại phòng ${incident.room_code} ${statusLabels[status] || "đã thay đổi trạng thái"}.`,
            type: "su_co",
            severity: status === "da_giai_quyet" ? "info" : "warning",
          });
        } catch (notificationError) {
          console.error("Không thể tạo thông báo sự cố:", notificationError);
        }
      }

      emitIncidentChange(io, "incident_updated", {
        incidentId: req.params.id,
        status,
        roomId: incident?.room_id,
      });
      if (restoration?.devicesRestored || deviceRepair?.restored) {
        io?.emit("devices_changed", { roomId: incident.room_id });
      }

      res.json({
        message: deviceRepair?.restored
          ? "Đã sửa xong và cấp điện lại cho thiết bị trên hệ thống."
          : deviceRepair?.blocked
            ? "Đã giải quyết sự cố; thiết bị vẫn ngắt điện vì còn sự cố hoặc phiếu bảo trì đang mở."
          : restoration?.powerRestored || restoration?.devicesRestored
          ? "Đã giải quyết sự cố, khôi phục nguồn điện và trạng thái thiết bị trước sự cố."
          : "Cập nhật trạng thái thành công",
      });
    } catch (error) {
      if (connection) await connection.rollback();
      res.status(500).json({ message: "Lỗi server", error: error.message });
    } finally {
      connection?.release();
    }
  },

  delete: async (req, res) => {
    try {
      const incident = await IncidentModel.getById(req.params.id);
      if (!incident) {
        return res.status(404).json({ message: "Không tìm thấy sự cố" });
      }
      await IncidentModel.delete(req.params.id);
      await syncRoomOperationalStatus(incident.room_id);
      emitIncidentChange(req.app.get("io"), "incident_deleted", {
        incidentId: Number(req.params.id),
        roomId: incident.room_id,
      });
      res.json({ message: "Xóa sự cố thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = incidentController;
