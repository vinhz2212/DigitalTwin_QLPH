const db = require("../config/database");

const UserModel = {
  findByUsername: async (username) => {
    const [rows] = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ? AND u.is_active = TRUE`,
      [username],
    );
    return rows[0];
  },

  findById: async (id) => {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.email_verified_at,
              u.full_name, u.phone, u.avatar,
              u.is_active, u.created_at, r.name as role_name
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id],
    );
    return rows[0];
  },

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.email, u.full_name, u.phone,
             u.is_active, u.created_at, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);
    return rows;
  },

  getRoles: async () => {
    const [rows] = await db.query("SELECT * FROM roles ORDER BY id");
    return rows;
  },

  create: async (userData) => {
    const { role_id, username, email, password_hash, full_name, phone } = userData;
    const [result] = await db.query(
      `INSERT INTO users (role_id, username, email, email_verified_at,
                          password_hash, full_name, phone)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
      [role_id, username, email, password_hash, full_name, phone],
    );
    return result.insertId;
  },

  update: async (id, data, emailChanged = false) => {
    const { role_id, full_name, email, phone, is_active } = data;
    const verificationReset = emailChanged
      ? `, email_verified_at=NULL, email_verification_token_hash=NULL,
           email_verification_expires_at=NULL, email_verification_attempts=0`
      : "";
    await db.query(
      `UPDATE users
       SET role_id=?, full_name=?, email=?, phone=?, is_active=?${verificationReset}
       WHERE id=?`,
      [role_id, full_name, email, phone, is_active, id],
    );
  },

  // Cập nhật hồ sơ cá nhân (chỉ các trường được phép)
  updateProfile: async (id, { full_name, email, phone }, verification = null, connection = db) => {
    if (verification) {
      await connection.query(
        `UPDATE users
         SET full_name=?, email=?, phone=?, email_verified_at=NULL,
             email_verification_token_hash=?, email_verification_expires_at=?,
             email_verification_attempts=0,
             updated_at=NOW()
         WHERE id=?`,
        [full_name, email, phone || null, verification.hash, verification.expiresAt, id],
      );
      return;
    }
    await connection.query(
      `UPDATE users SET full_name=?, email=?, phone=?, updated_at=NOW() WHERE id=?`,
      [full_name, email, phone || null, id],
    );
  },

  updatePassword: async (id, password_hash) => {
    await db.query(
      "UPDATE users SET password_hash=?, updated_at=NOW() WHERE id=?",
      [password_hash, id],
    );
  },

  // Lấy password_hash để verify khi đổi mật khẩu
  getPasswordHash: async (id) => {
    const [rows] = await db.query(
      "SELECT password_hash FROM users WHERE id=?",
      [id],
    );
    return rows[0]?.password_hash;
  },

  delete: async (id) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [users] = await connection.query(
        "SELECT id FROM Users WHERE id = ? FOR UPDATE",
        [id],
      );
      if (users.length === 0) {
        await connection.rollback();
        return false;
      }

      // Xóa dữ liệu riêng; giữ lịch sử vận hành chung nhưng bỏ liên kết đến người đã xóa.
      await connection.query("DELETE FROM AIAnalysis WHERE user_id = ?", [id]);
      await connection.query("DELETE FROM Bookings WHERE user_id = ?", [id]);
      await connection.query("DELETE FROM Notifications WHERE user_id = ?", [id]);
      await connection.query("DELETE FROM ActivityLogs WHERE user_id = ?", [id]);
      await connection.query("UPDATE DeviceStatusHistory SET changed_by = NULL WHERE changed_by = ?", [id]);
      await connection.query("UPDATE RoomStatusHistory SET changed_by = NULL WHERE changed_by = ?", [id]);
      await connection.query("UPDATE Incidents SET triggered_by = NULL WHERE triggered_by = ?", [id]);
      await connection.query("UPDATE Maintenance SET reported_by = NULL WHERE reported_by = ?", [id]);
      await connection.query("UPDATE Maintenance SET resolved_by = NULL WHERE resolved_by = ?", [id]);
      const [result] = await connection.query("DELETE FROM Users WHERE id = ?", [id]);
      await connection.commit();
      return result.affectedRows === 1;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

module.exports = UserModel;
