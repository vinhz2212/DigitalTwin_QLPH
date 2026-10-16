const db = require("../config/database");
const MaintenanceModel = require("../models/maintenanceModel");
const {
  syncRoomOperationalStatus,
} = require("../services/roomOperationalStatusService");
const {
  createForRoles,
  createForUser,
} = require("../services/notificationService");

const VALID_STATUSES = ["cho_xu_ly", "dang_sua", "da_xong"];
const ALLOWED_TRANSITIONS = {
  cho_xu_ly: ["dang_sua"],
  dang_sua: ["da_xong"],
  da_xong: [],
};

const emitMaintenanceChange = (req, payload) => {
  const io = req.app.get("io");
  if (!io) return;

  io.to("role:admin").emit("maintenance_changed", payload);
  io.to("role:ky_thuat_vien").emit("maintenance_changed", payload);
  io.emit("device_status_changed", {
    deviceId: payload.deviceId,
    status: payload.deviceStatus,
  });
  io.emit("rooms_changed", {
    action: "maintenance",
    roomId: payload.roomId,
  });
};

const maintenanceController = {
  getAll: async (req, res) => {
    try {
      res.json(await MaintenanceModel.getAll());
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      res.json(await MaintenanceModel.getStats());
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    const deviceId = Number(req.body.device_id);
    const description = String(req.body.description || "").trim();

    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return res.status(400).json({ message: "Thiết bị không hợp lệ" });
    }
    if (!description) {
      return res.status(400).json({ message: "Vui lòng nhập mô tả hư hỏng" });
    }

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const device = await MaintenanceModel.getDeviceById(
        deviceId,
        connection,
        true,
      );
      if (!device) {
        await connection.rollback();
        return res.status(404).json({ message: "Không tìm thấy thiết bị" });
      }

      const openTicket = await MaintenanceModel.findOpenByDevice(
        deviceId,
        connection,
      );
      if (openTicket) {
        await connection.rollback();
        return res.status(409).json({
          message: `Thiết bị đã có phiếu bảo trì #${openTicket.id} đang mở`,
        });
      }

      const id = await MaintenanceModel.create(
        {
          device_id: deviceId,
          reported_by: req.user.id,
          description,
          image_url: req.body.image_url,
        },
        connection,
      );
      await MaintenanceModel.updateDeviceStatus(
        deviceId,
        "hong",
        false,
        connection,
      );
      await syncRoomOperationalStatus(device.room_id, connection);
      await connection.commit();

      try {
        await createForRoles({
          io: req.app.get("io"),
          roles: ["admin", "ky_thuat_vien"],
          content: `Thiết bị ${device.name} tại phòng ${device.room_code} vừa được báo hỏng: ${description}`,
          type: "bao_tri",
          severity: "warning",
        });
      } catch (notificationError) {
        console.error("Không thể tạo thông báo bảo trì:", notificationError);
      }

      emitMaintenanceChange(req, {
        action: "created",
        maintenanceId: id,
        deviceId,
        deviceStatus: "hong",
        roomId: device.room_id,
      });
      return res.status(201).json({ message: "Báo hỏng thành công", id });
    } catch (error) {
      if (connection) await connection.rollback();
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  updateStatus: async (req, res) => {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Trạng thái bảo trì không hợp lệ" });
    }

    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const maintenance = await MaintenanceModel.getById(
        req.params.id,
        connection,
        true,
      );
      if (!maintenance) {
        await connection.rollback();
        return res.status(404).json({ message: "Không tìm thấy phiếu bảo trì" });
      }

      if (status === maintenance.status) {
        await connection.rollback();
        return res.json({ message: "Trạng thái không thay đổi", maintenance });
      }
      if (!ALLOWED_TRANSITIONS[maintenance.status]?.includes(status)) {
        await connection.rollback();
        return res.status(409).json({
          message:
            maintenance.status === "da_xong"
              ? "Phiếu bảo trì đã hoàn tất"
              : "Hãy chuyển đúng thứ tự: Chờ xử lý → Đang sửa → Đã xong",
        });
      }

      await MaintenanceModel.updateStatus(
        maintenance.id,
        status,
        req.user.id,
        connection,
      );
      const completed = status === "da_xong";
      const deviceStatus = completed ? "hoat_dong" : "dang_sua";
      await MaintenanceModel.updateDeviceStatus(
        maintenance.device_id,
        deviceStatus,
        completed,
        connection,
      );

      await syncRoomOperationalStatus(maintenance.room_id, connection);

      await connection.commit();
      try {
        const statusLabel = completed ? "đã sửa xong" : "đang được sửa";
        await createForUser({
          io: req.app.get("io"),
          userId: maintenance.reported_by,
          content: `Thiết bị ${maintenance.device_name} tại phòng ${maintenance.room_code} ${statusLabel}.`,
          type: "bao_tri",
          severity: completed ? "info" : "warning",
        });
      } catch (notificationError) {
        console.error("Không thể tạo thông báo bảo trì:", notificationError);
      }

      emitMaintenanceChange(req, {
        action: "status_updated",
        maintenanceId: maintenance.id,
        status,
        deviceId: maintenance.device_id,
        deviceStatus,
        roomId: maintenance.room_id,
      });
      return res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      if (connection) await connection.rollback();
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  delete: async (req, res) => {
    try {
      const maintenance = await MaintenanceModel.getById(req.params.id);
      if (!maintenance) {
        return res.status(404).json({ message: "Không tìm thấy phiếu bảo trì" });
      }
      if (maintenance.status !== "da_xong") {
        return res.status(409).json({
          message: "Chỉ có thể xóa phiếu bảo trì đã hoàn tất",
        });
      }

      await MaintenanceModel.delete(req.params.id);
      const io = req.app.get("io");
      if (io) {
        io.to("role:admin").emit("maintenance_changed", {
          action: "deleted",
          maintenanceId: Number(req.params.id),
        });
        io.to("role:ky_thuat_vien").emit("maintenance_changed", {
          action: "deleted",
          maintenanceId: Number(req.params.id),
        });
      }
      return res.json({ message: "Xóa phiếu bảo trì thành công" });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = maintenanceController;
