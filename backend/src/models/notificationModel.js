const db = require("../config/database");

const NotificationModel = {
  // Lấy tất cả thông báo của người dùng
  getByUser: async (userId, limit = 50) => {
    const [rows] = await db.query(
      `
      SELECT * FROM Notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
      [userId, limit],
    );
    return rows;
  },

  // Đánh dấu đã đọc 1 thông báo
  markAsRead: async (id, userId) => {
    await db.query(
      "UPDATE Notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      [id, userId],
    );
  },

  // Đánh dấu tất cả là đã đọc
  markAllAsRead: async (userId) => {
    await db.query(
      "UPDATE Notifications SET is_read = TRUE WHERE user_id = ?",
      [userId],
    );
  },

  // Xóa 1 thông báo
  delete: async (id, userId) => {
    await db.query("DELETE FROM Notifications WHERE id = ? AND user_id = ?", [
      id,
      userId,
    ]);
  },

  // Xóa tất cả thông báo
  deleteAll: async (userId) => {
    await db.query("DELETE FROM Notifications WHERE user_id = ?", [userId]);
  },

  // Tạo thông báo mới
  create: async (data) => {
    const { user_id, content, type, severity } = data;
    const [result] = await db.query(
      `
      INSERT INTO Notifications (user_id, content, type, severity)
      VALUES (?, ?, ?, ?)
    `,
      [user_id, content, type || "he_thong", severity || "info"],
    );
    return result.insertId;
  },
};

module.exports = NotificationModel;
