const db = require("../config/database");

const MaintenanceModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT m.*, d.name as device_name, dt.name as device_type,
             r.code as room_code, r.name as room_name,
             b.code as building_code,
             u1.full_name as reported_by_name,
             u2.full_name as resolved_by_name
      FROM Maintenance m
      JOIN Devices d ON m.device_id = d.id
      JOIN DeviceTypes dt ON d.device_type_id = dt.id
      JOIN Rooms r ON d.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      JOIN Users u1 ON m.reported_by = u1.id
      LEFT JOIN Users u2 ON m.resolved_by = u2.id
      ORDER BY m.created_at DESC
    `);
    return rows;
  },

  getStats: async () => {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'cho_xu_ly') as pending,
        SUM(status = 'dang_sua') as processing,
        SUM(status = 'da_xong') as done
      FROM Maintenance
    `);
    return rows[0];
  },

  create: async (data) => {
    const { device_id, reported_by, description, image_url } = data;
    const [result] = await db.query(
      `
      INSERT INTO Maintenance (device_id, reported_by, description, image_url)
      VALUES (?, ?, ?, ?)
    `,
      [device_id, reported_by, description, image_url],
    );
    return result.insertId;
  },

  updateStatus: async (id, status, resolved_by) => {
    const resolved_at = status === "da_xong" ? new Date() : null;
    await db.query(
      "UPDATE Maintenance SET status=?, resolved_by=?, resolved_at=? WHERE id=?",
      [status, resolved_by, resolved_at, id],
    );
  },

  delete: async (id) => {
    await db.query("DELETE FROM Maintenance WHERE id=?", [id]);
  },
};

module.exports = MaintenanceModel;
