const db = require("../config/database");

const IncidentModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT i.*, r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name,
             u.full_name as triggered_by_name
      FROM Incidents i
      JOIN Rooms r ON i.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      LEFT JOIN Users u ON i.triggered_by = u.id
      ORDER BY i.occurred_at DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT i.*, r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name,
             u.full_name as triggered_by_name
      FROM Incidents i
      JOIN Rooms r ON i.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      LEFT JOIN Users u ON i.triggered_by = u.id
      WHERE i.id = ?
    `,
      [id],
    );
    return rows[0];
  },

  getStats: async () => {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'dang_xay_ra') as active,
        SUM(status = 'dang_xu_ly') as processing,
        SUM(status = 'da_giai_quyet') as resolved,
        SUM(severity = 'nghiem_trong') as critical
      FROM Incidents
    `);
    return rows[0];
  },

  create: async (data) => {
    const { room_id, type, description, severity, triggered_by } = data;
    const [result] = await db.query(
      `
      INSERT INTO Incidents (room_id, type, description, severity, triggered_by, simulated)
      VALUES (?, ?, ?, ?, ?, TRUE)
    `,
      [room_id, type, description, severity, triggered_by],
    );
    return result.insertId;
  },

  updateStatus: async (id, status) => {
    const resolved_at = status === "da_giai_quyet" ? new Date() : null;
    await db.query("UPDATE Incidents SET status=?, resolved_at=? WHERE id=?", [
      status,
      resolved_at,
      id,
    ]);
  },

  delete: async (id) => {
    await db.query("DELETE FROM Incidents WHERE id=?", [id]);
  },
};

module.exports = IncidentModel;
