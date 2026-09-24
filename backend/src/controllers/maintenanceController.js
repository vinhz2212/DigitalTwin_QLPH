const MaintenanceModel = require("../models/maintenanceModel");

const maintenanceController = {
  getAll: async (req, res) => {
    try {
      const list = await MaintenanceModel.getAll();
      res.json(list);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getStats: async (req, res) => {
    try {
      const stats = await MaintenanceModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const data = { ...req.body, reported_by: req.user.id };
      const id = await MaintenanceModel.create(data);
      res.status(201).json({ message: "Báo hỏng thành công", id });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      await MaintenanceModel.updateStatus(req.params.id, status, req.user.id);
      res.json({ message: "Cập nhật trạng thái thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await MaintenanceModel.delete(req.params.id);
      res.json({ message: "Xóa thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = maintenanceController;
