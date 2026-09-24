const ScheduleModel = require("../models/scheduleModel");

const scheduleController = {
  getAll: async (req, res) => {
    try {
      const schedules = await ScheduleModel.getAll();
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getByRoom: async (req, res) => {
    try {
      const schedules = await ScheduleModel.getByRoom(req.params.roomId);
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const id = await ScheduleModel.create(req.body);
      res.status(201).json({ message: "Thêm lịch học thành công", id });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      await ScheduleModel.update(req.params.id, req.body);
      res.json({ message: "Cập nhật thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      await ScheduleModel.delete(req.params.id);
      res.json({ message: "Xóa lịch học thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = scheduleController;
