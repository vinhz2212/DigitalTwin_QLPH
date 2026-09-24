const db = require("../config/database");

const ScheduleModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT s.*, r.code as room_code, r.name as room_name,
             f.floor_number, b.code as building_code, b.name as building_name
      FROM Schedules s
      JOIN Rooms r ON s.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      ORDER BY s.day_of_week, s.start_time
    `);
    return rows;
  },

  getByRoom: async (roomId) => {
    const [rows] = await db.query(
      `
      SELECT * FROM Schedules WHERE room_id = ?
      ORDER BY day_of_week, start_time
    `,
      [roomId],
    );
    return rows;
  },

  create: async (data) => {
    const {
      room_id,
      subject,
      instructor,
      day_of_week,
      start_time,
      end_time,
      semester,
    } = data;
    const [result] = await db.query(
      `
      INSERT INTO Schedules (room_id, subject, instructor, day_of_week, start_time, end_time, semester)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        room_id,
        subject,
        instructor,
        day_of_week,
        start_time,
        end_time,
        semester,
      ],
    );
    return result.insertId;
  },

  update: async (id, data) => {
    const {
      room_id,
      subject,
      instructor,
      day_of_week,
      start_time,
      end_time,
      semester,
    } = data;
    await db.query(
      `
      UPDATE Schedules SET room_id=?, subject=?, instructor=?, day_of_week=?,
      start_time=?, end_time=?, semester=? WHERE id=?
    `,
      [
        room_id,
        subject,
        instructor,
        day_of_week,
        start_time,
        end_time,
        semester,
        id,
      ],
    );
  },

  delete: async (id) => {
    await db.query("DELETE FROM Schedules WHERE id=?", [id]);
  },
};

module.exports = ScheduleModel;
