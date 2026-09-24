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
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.avatar,
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
      `INSERT INTO users (role_id, username, email, password_hash, full_name, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [role_id, username, email, password_hash, full_name, phone],
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { role_id, full_name, email, phone, is_active } = data;
    await db.query(
      `UPDATE users SET role_id=?, full_name=?, email=?, phone=?, is_active=? WHERE id=?`,
      [role_id, full_name, email, phone, is_active, id],
    );
  },

  // Cập nhật hồ sơ cá nhân (chỉ các trường được phép)
  updateProfile: async (id, { full_name, email, phone }) => {
    await db.query(
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
    await db.query("DELETE FROM users WHERE id=?", [id]);
  },
};

module.exports = UserModel;
