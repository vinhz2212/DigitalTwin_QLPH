const db = require("../config/database");

const bookingSelect = `
  SELECT b.*, r.code AS room_code, r.name AS room_name,
         f.floor_number, bl.code AS building_code, bl.name AS building_name,
         u.full_name AS user_name, u.email AS user_email
  FROM Bookings b
  JOIN Rooms r ON b.room_id = r.id
  JOIN Floors f ON r.floor_id = f.id
  JOIN Buildings bl ON f.building_id = bl.id
  JOIN Users u ON b.user_id = u.id
`;

const BookingModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      ${bookingSelect}
      ORDER BY b.created_at DESC
    `);

    return rows;
  },

  // Lấy các lượt đặt của riêng một người dùng
  getByUser: async (userId) => {
    const [rows] = await db.query(
      `
        ${bookingSelect}
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
      `,
      [userId],
    );

    return rows;
  },

  getStats: async () => {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(status = 'cho_duyet'), 0) AS pending,
        COALESCE(SUM(status = 'da_duyet'), 0) AS approved,
        COALESCE(SUM(status = 'tu_choi'), 0) AS rejected,
        COALESCE(SUM(status = 'da_huy'), 0) AS cancelled
      FROM Bookings
    `);

    return rows[0];
  },

  create: async (data) => {
    const { user_id, room_id, date, start_time, end_time, purpose, note } =
      data;

    const [result] = await db.query(
      `
        INSERT INTO Bookings
          (user_id, room_id, date, start_time, end_time, purpose, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [user_id, room_id, date, start_time, end_time, purpose, note],
    );

    return result.insertId;
  },

  updateStatus: async (id, status) => {
    await db.query("UPDATE Bookings SET status = ? WHERE id = ?", [status, id]);
  },

  delete: async (id) => {
    await db.query("DELETE FROM Bookings WHERE id = ?", [id]);
  },
};

module.exports = BookingModel;
