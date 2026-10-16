const db = require("../config/database");

const LogModel = {
  getAll: async ({ limit = 100, from = "", to = "" } = {}) => {
    const conditions = [];
    const params = [];

    if (from) {
      conditions.push("l.created_at >= ?");
      params.push(`${from} 00:00:00`);
    }
    if (to) {
      conditions.push("l.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(`${to} 00:00:00`);
    }

    const [rows] = await db.query(
      `
      SELECT l.*, u.full_name, u.username
      FROM ActivityLogs l
      LEFT JOIN Users u ON l.user_id = u.id
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY l.created_at DESC
      LIMIT ?
      `,
      [...params, limit],
    );

    return rows;
  },

  create: async (data) => {
    const { user_id, action, entity_type, entity_id, details, ip_address } =
      data;

    const [result] = await db.query(
      `
      INSERT INTO ActivityLogs
        (user_id, action, entity_type, entity_id, details, ip_address)
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
    return result.insertId;
  },

  removeById: async (id) => {
    const [result] = await db.query("DELETE FROM ActivityLogs WHERE id = ?", [
      id,
    ]);

    return result.affectedRows > 0;
  },
};

module.exports = LogModel;
