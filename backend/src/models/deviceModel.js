const db = require("../config/database");

const DeviceModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT d.*, dt.name as type_name, dt.icon,
             r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name
      FROM Devices d
      JOIN DeviceTypes dt ON d.device_type_id = dt.id
      JOIN Rooms r ON d.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      ORDER BY b.code, f.floor_number, r.code, dt.name
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT d.*, dt.name as type_name, dt.icon,
             r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name
      FROM Devices d
      JOIN DeviceTypes dt ON d.device_type_id = dt.id
      JOIN Rooms r ON d.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      WHERE d.id = ?
    `,
      [id],
    );
    return rows[0];
  },

  getByRoom: async (roomId) => {
    const [rows] = await db.query(
      `
      SELECT d.*, dt.name as type_name, dt.icon
      FROM Devices d
      JOIN DeviceTypes dt ON d.device_type_id = dt.id
      WHERE d.room_id = ?
      ORDER BY dt.name
    `,
      [roomId],
    );
    return rows;
  },

  getStats: async () => {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'hoat_dong') as active,
        SUM(status = 'tat') as off,
        SUM(status = 'hong') as broken,
        SUM(status = 'dang_sua') as repairing
      FROM Devices
    `);
    return rows[0];
  },

  getTypes: async () => {
    const [rows] = await db.query("SELECT * FROM DeviceTypes ORDER BY name");
    return rows;
  },

  create: async (data) => {
    const { room_id, device_type_id, name, status, installed_at, notes } = data;
    const [result] = await db.query(
      `
      INSERT INTO Devices (room_id, device_type_id, name, status, installed_at, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [room_id, device_type_id, name, status, installed_at, notes],
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const { name, status, installed_at, last_maintenance, notes } = data;
    await db.query(
      `
      UPDATE Devices SET name=?, status=?, installed_at=?, last_maintenance=?, notes=?
      WHERE id=?
    `,
      [name, status, installed_at, last_maintenance, notes, id],
    );
  },

  updateStatus: async (id, status) => {
    await db.query("UPDATE Devices SET status=? WHERE id=?", [status, id]);
  },

  delete: async (id) => {
    await db.query("DELETE FROM Devices WHERE id=?", [id]);
  },
};

module.exports = DeviceModel;
