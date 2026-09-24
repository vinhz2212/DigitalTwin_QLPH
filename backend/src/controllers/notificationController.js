const NotificationModel = require("../models/notificationModel");

const notificationController = {
  // Lấy tất cả thông báo của người dùng hiện tại
  getAll: async (req, res) => {
    try {
      const userId = req.user.id;
      const notifications = await NotificationModel.getByUser(userId, 100);
      res.json(notifications);
    } catch (error) {
      console.error("Lỗi lấy thông báo:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Đánh dấu 1 thông báo đã đọc
  markRead: async (req, res) => {
    try {
      const { id } = req.params;
      await NotificationModel.markAsRead(id, req.user.id);
      res.json({ message: "Đã đánh dấu đã đọc" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Đánh dấu tất cả đã đọc
  markAllRead: async (req, res) => {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      res.json({ message: "Đã đánh dấu tất cả là đã đọc" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Xóa 1 thông báo
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await NotificationModel.delete(id, req.user.id);
      res.json({ message: "Đã xóa thông báo" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Xóa tất cả thông báo
  deleteAll: async (req, res) => {
    try {
      await NotificationModel.deleteAll(req.user.id);
      res.json({ message: "Đã xóa tất cả thông báo" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = notificationController;
