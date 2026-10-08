const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const db = require("../config/database");

// Thống kê tổng quan
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const [[roomStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'trong') as trong,
        SUM(status = 'dang_hoc') as dang_hoc,
        SUM(status = 'bao_tri') as bao_tri,
        SUM(status = 'su_co') as su_co
      FROM Rooms
    `);

    const [[deviceStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'hoat_dong') as hoat_dong,
        SUM(status = 'hong') as hong,
        SUM(status = 'dang_sua') as dang_sua,
        SUM(status = 'tat') as tat
      FROM Devices
    `);

    const [[incidentStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'dang_xay_ra') as dang_xay_ra,
        SUM(status = 'dang_xu_ly') as dang_xu_ly,
        SUM(status = 'da_giai_quyet') as da_giai_quyet
      FROM Incidents
    `);

    const [[bookingStats]] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'cho_duyet') as cho_duyet,
        SUM(status = 'da_duyet') as da_duyet,
        SUM(status = 'tu_choi') as tu_choi
      FROM Bookings
    `);

    res.json({ roomStats, deviceStats, incidentStats, bookingStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Thống kê phòng theo tòa nhà
router.get("/rooms-by-building", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        b.code as name,
        COUNT(*) as total,
        SUM(r.status = 'trong') as trong,
        SUM(r.status = 'dang_hoc') as dang_hoc,
        SUM(r.status = 'bao_tri') as bao_tri,
        SUM(r.status = 'su_co') as su_co
      FROM Rooms r
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      GROUP BY b.id, b.code
      ORDER BY b.code
    `);
    res.json(rows.map((r) => ({ ...r, name: `Tòa ${r.name}` })));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Thống kê sự cố 7 ngày gần nhất
router.get("/incidents-weekly", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        DATE(occurred_at) as date,
        COUNT(*) as total,
        SUM(type = 'chay') as chay,
        SUM(type = 'mat_dien') as mat_dien,
        SUM(type = 'may_chieu_hong') as may_chieu,
        SUM(type = 'dieu_hoa_hong') as dieu_hoa
      FROM Incidents
      WHERE occurred_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(occurred_at)
      ORDER BY date ASC
    `);
    res.json(
      rows.map((r) => ({
        ...r,
        date: new Date(r.date).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
      })),
    );
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Thống kê bảo trì theo tháng
router.get("/maintenance-monthly", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        MONTH(created_at) as month,
        COUNT(*) as count
      FROM Maintenance
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY MONTH(created_at)
      ORDER BY month ASC
    `);
    res.json(rows.map((r) => ({ month: `T${r.month}`, count: r.count })));
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// Top phòng sử dụng nhiều nhất (dựa trên bookings)
router.get("/top-rooms", authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.code,
        b.code as building_code,
        b.name as building_name,
        COUNT(bk.id) as booking_count
      FROM Rooms r
      LEFT JOIN Bookings bk ON r.id = bk.room_id AND bk.status = 'da_duyet'
      JOIN Floors f ON r.floor_id = f.id
      JOIN Buildings b ON f.building_id = b.id
      GROUP BY r.id, r.code, b.code, b.name
      ORDER BY booking_count DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

module.exports = router;
