const db = require("../config/database");

const ScheduleModel = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT
        s.id,
        s.room_id,
        s.subject,
        s.session_type,
        s.instructor,
        DATE_FORMAT(s.class_date, '%Y-%m-%d') AS class_date,
        s.start_time,
        s.end_time,
        s.semester,
        s.created_at,
        r.code AS room_code,
        r.name AS room_name,
        f.floor_number,
        b.code AS building_code,
        b.name AS building_name
      FROM Schedules s
      JOIN Rooms r ON s.room_id = r.id
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      ORDER BY s.class_date ASC, s.start_time ASC
    `);

    return rows;
  },

  getByRoom: async (roomId) => {
    const [rows] = await db.query(
      `
        SELECT
          id,
          room_id,
          subject,
          session_type,
          instructor,
          DATE_FORMAT(class_date, '%Y-%m-%d') AS class_date,
          start_time,
          end_time,
          semester,
          created_at
        FROM Schedules
        WHERE room_id = ?
        ORDER BY class_date ASC, start_time ASC
      `,
      [roomId],
    );

    return rows;
  },

  create: async (data) => {
    const {
      room_id,
      subject,
      session_type,
      instructor,
      class_date,
      start_time,
      end_time,
      semester,
    } = data;

    const [result] = await db.query(
      `
        INSERT INTO Schedules (
          room_id,
          subject,
          session_type,
          instructor,
          class_date,
          start_time,
          end_time,
          semester
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        room_id,
        subject,
        session_type,
        instructor || null,
        class_date,
        start_time,
        end_time,
        semester || null,
      ],
    );

    return result.insertId;
  },

  update: async (id, data) => {
    const {
      room_id,
      subject,
      session_type,
      instructor,
      class_date,
      start_time,
      end_time,
      semester,
    } = data;

    const [result] = await db.query(
      `
        UPDATE Schedules
        SET
          room_id = ?,
          subject = ?,
          session_type = ?,
          instructor = ?,
          class_date = ?,
          start_time = ?,
          end_time = ?,
          semester = ?
        WHERE id = ?
      `,
      [
        room_id,
        subject,
        session_type,
        instructor || null,
        class_date,
        start_time,
        end_time,
        semester || null,
        id,
      ],
    );

    return result.affectedRows;
  },

  delete: async (id) => {
    const [result] = await db.query("DELETE FROM Schedules WHERE id = ?", [id]);

    return result.affectedRows;
  },
};

module.exports = ScheduleModel;
