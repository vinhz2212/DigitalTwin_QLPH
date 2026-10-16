const NotificationModel = require("../models/notificationModel");

const emitNotificationChange = (req) => {
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${req.user.id}`).emit("notification_updated");
  }
};

const getNotificationId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const notificationController = {
  // Lấy tất cả thông báo
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

  // ✅ Lấy số thông báo chưa đọc
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const count = await NotificationModel.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Lỗi lấy số thông báo:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Đánh dấu 1 thông báo đã đọc
  markRead: async (req, res) => {
    try {
      const id = getNotificationId(req.params.id);
      if (!id) {
        return res.status(400).json({ message: "Mã thông báo không hợp lệ" });
      }
      const affectedRows = await NotificationModel.markAsRead(id, req.user.id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy thông báo" });
      }
      emitNotificationChange(req);
      res.json({ message: "Đã đánh dấu đã đọc" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Đánh dấu tất cả đã đọc
  markAllRead: async (req, res) => {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      emitNotificationChange(req);
      res.json({ message: "Đã đánh dấu tất cả là đã đọc" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Xóa 1 thông báo
  delete: async (req, res) => {
    try {
      const id = getNotificationId(req.params.id);
      if (!id) {
        return res.status(400).json({ message: "Mã thông báo không hợp lệ" });
      }
      const affectedRows = await NotificationModel.delete(id, req.user.id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy thông báo" });
      }
      emitNotificationChange(req);
      res.json({ message: "Đã xóa thông báo" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Xóa tất cả thông báo
  deleteAll: async (req, res) => {
    try {
      await NotificationModel.deleteAll(req.user.id);
      emitNotificationChange(req);
      res.json({ message: "Đã xóa tất cả thông báo" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = notificationController;
