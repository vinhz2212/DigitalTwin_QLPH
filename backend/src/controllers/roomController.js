const RoomModel = require("../models/roomModel");

const roomController = {
  getAll: async (req, res) => {
    try {
      const rooms = await RoomModel.getAll();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const room = await RoomModel.getById(req.params.id);
      if (!room)
        return res.status(404).json({ message: "Không tìm thấy phòng" });
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await RoomModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getAvailable: async (req, res) => {
    try {
      const rooms = await RoomModel.getAvailable();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getBuildings: async (req, res) => {
    try {
      const buildings = await RoomModel.getBuildings();
      res.json(buildings);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getFloors: async (req, res) => {
    try {
      const floors = await RoomModel.getFloorsByBuilding(req.params.buildingId);
      res.json(floors);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const id = await RoomModel.create(req.body);
      const room = await RoomModel.getById(id);
      res.status(201).json({ message: "Tạo phòng thành công", room });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      await RoomModel.update(req.params.id, req.body);
      const room = await RoomModel.getById(req.params.id);
      res.json({ message: "Cập nhật thành công", room });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      await RoomModel.updateStatus(req.params.id, status);

      // Gửi socket realtime
      const io = req.app.get("io");
      io.emit("room_status_changed", { roomId: req.params.id, status });

      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await RoomModel.delete(req.params.id);
      res.json({ message: "Xóa phòng thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = roomController;
