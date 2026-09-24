const db = require("../config/database");

const BookingModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT b.*, r.code as room_code, r.name as room_name,
             f.floor_number, bl.code as building_code, bl.name as building_name,
             u.full_name as user_name, u.email as user_email
      FROM Bookings b
      JOIN Rooms r ON b.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings bl ON f.building_id = bl.id
      JOIN Users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    return rows;
  },

  getStats: async () => {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'cho_duyet') as pending,
        SUM(status = 'da_duyet') as approved,
        SUM(status = 'tu_choi') as rejected,
        SUM(status = 'da_huy') as cancelled
      FROM Bookings
    `);
    return rows[0];
  },

  create: async (data) => {
    const { user_id, room_id, date, start_time, end_time, purpose, note } =
      data;
    const [result] = await db.query(
      `
      INSERT INTO Bookings (user_id, room_id, date, start_time, end_time, purpose, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [user_id, room_id, date, start_time, end_time, purpose, note],
    );
    return result.insertId;
  },

  updateStatus: async (id, status) => {
    await db.query("UPDATE Bookings SET status=? WHERE id=?", [status, id]);
  },

  delete: async (id) => {
    await db.query("DELETE FROM Bookings WHERE id=?", [id]);
  },
};

module.exports = BookingModel;
