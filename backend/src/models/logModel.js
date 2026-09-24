const db = require("../config/database");

const LogModel = {
  getAll: async (limit = 100) => {
    const [rows] = await db.query(
      `
      SELECT l.*, u.full_name, u.username
      FROM ActivityLogs l
      LEFT JOIN Users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `,
      [limit],
    );
    return rows;
  },

  create: async (data) => {
    const { user_id, action, entity_type, entity_id, details, ip_address } =
      data;
    await db.query(
      `
      INSERT INTO ActivityLogs (user_id, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        user_id,
        action,
        entity_type,
        entity_id,
        details ? JSON.stringify(details) : null,
        ip_address,
      ],
    );
  },
};

module.exports = LogModel;
