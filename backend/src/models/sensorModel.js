const db = require("../config/database");

const SensorModel = {
  // Lấy danh sách phòng
  getRoomList: async () => {
    const [rows] = await db.query(`
      SELECT r.id, r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name
      FROM rooms r
      JOIN floors f ON r.floor_id = f.id
      JOIN buildings b ON f.building_id = b.id
      ORDER BY b.code, f.floor_number, r.code
    `);
    return rows;
  },

  // Lấy dữ liệu cảm biến mới nhất của 1 phòng (tất cả loại)
  getLatestByRoom: async (roomId) => {
    const [rows] = await db.query(
      `
      SELECT s.type, s.value, s.unit, s.is_alert,
             s.threshold_min, s.threshold_max, s.recorded_at
      FROM sensors s
      INNER JOIN (
        SELECT type, MAX(recorded_at) as max_recorded
        FROM sensors
        WHERE room_id = ?
        GROUP BY type
      ) latest ON s.type = latest.type AND s.recorded_at = latest.max_recorded
      WHERE s.room_id = ?
    `,
      [roomId, roomId],
    );
    return rows;
  },

  // Lấy lịch sử 1 loại cảm biến của phòng
  getHistory: async (roomId, type, limit = 24) => {
    const [rows] = await db.query(
      `
      SELECT value, unit, is_alert, recorded_at
      FROM sensors
      WHERE room_id = ? AND type = ?
      ORDER BY recorded_at DESC
      LIMIT ?
    `,
      [roomId, type, limit],
    );
    return rows.reverse();
  },

  // Lưu 1 bản đọc cảm biến
  create: async ({ room_id, type, value, unit, is_alert, threshold_min, threshold_max }) => {
    const [result] = await db.query(
      `INSERT INTO sensors (room_id, type, value, unit, is_alert, threshold_min, threshold_max)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [room_id, type, value, unit || "", is_alert || false, threshold_min, threshold_max],
    );
    return result.insertId;
  },
};

module.exports = SensorModel;
