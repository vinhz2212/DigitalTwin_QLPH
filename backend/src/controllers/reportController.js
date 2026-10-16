const db = require("../config/database");

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const getDateFilter = (column, from, to) => {
  const conditions = [];
  const params = [];
  if (from) {
    conditions.push(`DATE(${column}) >= ?`);
    params.push(from);
  }
  if (to) {
    conditions.push(`DATE(${column}) <= ?`);
    params.push(to);
  }
  return {
    sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
};

const reportController = {
  getData: async (req, res) => {
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return res.status(400).json({ message: "Khoảng ngày báo cáo không hợp lệ." });
    }
    if (from && to && from > to) {
      return res.status(400).json({
        message: "Ngày bắt đầu không được sau ngày kết thúc.",
      });
    }

    const incidentFilter = getDateFilter("i.occurred_at", from, to);
    const maintenanceFilter = getDateFilter("m.created_at", from, to);
    const bookingFilter = getDateFilter("bk.date", from, to);
    const scheduleFilter = getDateFilter("s.class_date", from, to);

    try {
      const [
        [rooms],
        [devices],
        [incidents],
        [maintenance],
        [bookings],
        [schedules],
      ] = await Promise.all([
        db.query(`
          SELECT r.id, r.code, r.name, r.capacity, r.type, r.status,
                 f.floor_number, b.code AS building_code,
                 b.name AS building_name
          FROM Rooms r
          JOIN Floors f ON f.id = r.floor_id
          JOIN Buildings b ON b.id = f.building_id
          ORDER BY b.code, f.floor_number, r.code
        `),
        db.query(`
          SELECT d.id, d.name, d.status, d.installed_at,
                 d.last_maintenance, dt.name AS type_name,
                 r.code AS room_code, b.code AS building_code,
                 b.name AS building_name
          FROM Devices d
          JOIN DeviceTypes dt ON dt.id = d.device_type_id
          JOIN Rooms r ON r.id = d.room_id
          JOIN Floors f ON f.id = r.floor_id
          JOIN Buildings b ON b.id = f.building_id
          ORDER BY b.code, r.code, dt.name
        `),
        db.query(
          `SELECT i.id, i.type, i.description, i.severity, i.status,
                  i.simulated, i.occurred_at, i.resolved_at,
                  r.code AS room_code, b.name AS building_name,
                  u.full_name AS triggered_by_name
           FROM Incidents i
           JOIN Rooms r ON r.id = i.room_id
           JOIN Floors f ON f.id = r.floor_id
           JOIN Buildings b ON b.id = f.building_id
           LEFT JOIN Users u ON u.id = i.triggered_by
           ${incidentFilter.sql}
           ORDER BY i.occurred_at DESC`,
          incidentFilter.params,
        ),
        db.query(
          `SELECT m.id, m.description, m.status, m.created_at, m.resolved_at,
                  d.name AS device_name, dt.name AS device_type,
                  r.code AS room_code, b.name AS building_name,
                  reporter.full_name AS reported_by_name,
                  resolver.full_name AS resolved_by_name
           FROM Maintenance m
           JOIN Devices d ON d.id = m.device_id
           JOIN DeviceTypes dt ON dt.id = d.device_type_id
           JOIN Rooms r ON r.id = d.room_id
           JOIN Floors f ON f.id = r.floor_id
           JOIN Buildings b ON b.id = f.building_id
           JOIN Users reporter ON reporter.id = m.reported_by
           LEFT JOIN Users resolver ON resolver.id = m.resolved_by
           ${maintenanceFilter.sql}
           ORDER BY m.created_at DESC`,
          maintenanceFilter.params,
        ),
        db.query(
          `SELECT bk.id, bk.date, bk.start_time, bk.end_time, bk.purpose,
                  bk.status, bk.created_at, r.code AS room_code,
                  b.name AS building_name, u.full_name AS user_name,
                  u.email AS user_email
           FROM Bookings bk
           JOIN Rooms r ON r.id = bk.room_id
           JOIN Floors f ON f.id = r.floor_id
           JOIN Buildings b ON b.id = f.building_id
           JOIN Users u ON u.id = bk.user_id
           ${bookingFilter.sql}
           ORDER BY bk.date DESC, bk.start_time DESC`,
          bookingFilter.params,
        ),
        db.query(
          `SELECT s.id, s.subject, s.session_type, s.instructor,
                  s.class_date, s.start_time, s.end_time, s.semester,
                  r.code AS room_code, b.name AS building_name
           FROM Schedules s
           JOIN Rooms r ON r.id = s.room_id
           JOIN Floors f ON f.id = r.floor_id
           JOIN Buildings b ON b.id = f.building_id
           ${scheduleFilter.sql}
           ORDER BY s.class_date DESC, s.start_time DESC`,
          scheduleFilter.params,
        ),
      ]);

      return res.json({
        generated_at: new Date(),
        filters: { from: from || null, to: to || null },
        rooms,
        devices,
        incidents,
        maintenance,
        bookings,
        schedules,
      });
    } catch (error) {
      console.error("Không thể tạo dữ liệu báo cáo:", error);
      return res.status(500).json({ message: "Không thể tải dữ liệu báo cáo." });
    }
  },
};

module.exports = reportController;
