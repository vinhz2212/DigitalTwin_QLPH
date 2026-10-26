const DeviceModel = require("../models/deviceModel");
const RoomModel = require("../models/roomModel");

const emitDeviceChange = (req, payload) => {
  const io = req.app.get("io");
  if (io) io.emit("devices_changed", payload);
};

const deviceController = {
  getAll: async (req, res) => {
    try {
      const devices = await DeviceModel.getAll();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const device = await DeviceModel.getById(req.params.id);
      if (!device)
        return res.status(404).json({ message: "Không tìm thấy thiết bị" });
      res.json(device);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getByRoom: async (req, res) => {
    try {
      const devices = await DeviceModel.getByRoom(req.params.roomId);
      res.json(devices);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await DeviceModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getTypes: async (req, res) => {
    try {
      const types = await DeviceModel.getTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      if (req.body.status === "hoat_dong") {
        const room = await RoomModel.getById(req.body.room_id);
        if (room?.power_status === "ngat_dien") {
          return res.status(409).json({ message: "Phòng đang ngắt nguồn điện mô phỏng; không thể bật thiết bị." });
        }
      }
      const id = await DeviceModel.create(req.body);
      const device = await DeviceModel.getById(id);
      emitDeviceChange(req, { action: "created", deviceId: id });
      res.status(201).json({ message: "Thêm thiết bị thành công", device });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      if (req.body.status === "hoat_dong") {
        const currentDevice = await DeviceModel.getById(req.params.id);
        if (currentDevice?.room_power_status === "ngat_dien" || currentDevice?.power_status === "ngat_dien") {
          return res.status(409).json({ message: "Nguồn phòng hoặc thiết bị đang bị ngắt; hãy giải quyết sự cố hoặc hoàn tất bảo trì trước." });
        }
      }
      await DeviceModel.update(req.params.id, req.body);
      const device = await DeviceModel.getById(req.params.id);
      emitDeviceChange(req, {
        action: "updated",
        deviceId: Number(req.params.id),
      });
      res.json({ message: "Cập nhật thành công", device });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (status === "hoat_dong") {
        const currentDevice = await DeviceModel.getById(req.params.id);
        if (currentDevice?.room_power_status === "ngat_dien" || currentDevice?.power_status === "ngat_dien") {
          return res.status(409).json({ message: "Nguồn phòng hoặc thiết bị đang bị ngắt; hãy giải quyết sự cố hoặc hoàn tất bảo trì trước." });
        }
      }
      await DeviceModel.updateStatus(req.params.id, status);

      const io = req.app.get("io");
      if (io) {
        io.emit("device_status_changed", { deviceId: req.params.id, status });
      }

      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await DeviceModel.delete(req.params.id);
      emitDeviceChange(req, {
        action: "deleted",
        deviceId: Number(req.params.id),
      });
      res.json({ message: "Xóa thiết bị thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = deviceController;
