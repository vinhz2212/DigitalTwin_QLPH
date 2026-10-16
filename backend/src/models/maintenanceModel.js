const db = require("../config/database");

const MaintenanceModel = {
  getAll: async (executor = db) => {
    const [rows] = await executor.query(`
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

  getById: async (id, executor = db, forUpdate = false) => {
    const [rows] = await executor.query(
      `SELECT m.*, d.room_id, d.name AS device_name,
              d.status AS device_status, r.code AS room_code
       FROM Maintenance m
       JOIN Devices d ON m.device_id = d.id
       JOIN Rooms r ON d.room_id = r.id
       WHERE m.id = ?
       ${forUpdate ? "FOR UPDATE" : ""}`,
      [id],
    );
    return rows[0];
  },

  getDeviceById: async (id, executor = db, forUpdate = false) => {
    const [rows] = await executor.query(
      `SELECT d.id, d.room_id, d.name, d.status, r.code AS room_code
       FROM Devices d
       JOIN Rooms r ON d.room_id = r.id
       WHERE d.id = ?
       ${forUpdate ? "FOR UPDATE" : ""}`,
      [id],
    );
    return rows[0];
  },

  findOpenByDevice: async (deviceId, executor = db) => {
    const [rows] = await executor.query(
      `SELECT id, status
       FROM Maintenance
       WHERE device_id = ? AND status IN ('cho_xu_ly', 'dang_sua')
       ORDER BY created_at DESC
       LIMIT 1`,
      [deviceId],
    );
    return rows[0];
  },

  getStats: async (executor = db) => {
    const [rows] = await executor.query(`
      SELECT COUNT(*) as total,
             COALESCE(SUM(status = 'cho_xu_ly'), 0) as pending,
             COALESCE(SUM(status = 'dang_sua'), 0) as processing,
             COALESCE(SUM(status = 'da_xong'), 0) as done
      FROM Maintenance
    `);
    return rows[0];
  },

  create: async (data, executor = db) => {
    const { device_id, reported_by, description, image_url } = data;
    const [result] = await executor.query(
      `INSERT INTO Maintenance
         (device_id, reported_by, description, image_url)
       VALUES (?, ?, ?, ?)`,
      [device_id, reported_by, description, image_url || null],
    );
    return result.insertId;
  },

  updateStatus: async (id, status, resolvedBy, executor = db) => {
    const [result] = await executor.query(
      `UPDATE Maintenance
       SET status = ?,
           resolved_by = CASE WHEN ? = 'da_xong' THEN ? ELSE NULL END,
           resolved_at = CASE WHEN ? = 'da_xong' THEN NOW() ELSE NULL END
       WHERE id = ?`,
      [status, status, resolvedBy, status, id],
    );
    return result.affectedRows;
  },

  updateDeviceStatus: async (deviceId, status, completed, executor = db) => {
    await executor.query(
      `UPDATE Devices
       SET status = ?,
           last_maintenance = CASE WHEN ? THEN CURDATE() ELSE last_maintenance END
       WHERE id = ?`,
      [status, completed, deviceId],
    );
  },

  delete: async (id, executor = db) => {
    const [result] = await executor.query(
      "DELETE FROM Maintenance WHERE id = ?",
      [id],
    );
    return result.affectedRows;
  },
};

module.exports = MaintenanceModel;
