const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const db = require("../config/database");
const RoomModel = require("../models/roomModel");

// Thống kê tổng quan
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    const [roomStats, [[deviceStats]], [[incidentStats]], [[bookingStats]]] =
      await Promise.all([
        RoomModel.getStats(),
        db.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(status = 'hoat_dong'), 0) as hoat_dong,
        COALESCE(SUM(status = 'hong'), 0) as hong,
        COALESCE(SUM(status = 'dang_sua'), 0) as dang_sua,
        COALESCE(SUM(status = 'tat'), 0) as tat
      FROM Devices
    `),
        db.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(status = 'dang_xay_ra'), 0) as dang_xay_ra,
        COALESCE(SUM(status = 'dang_xu_ly'), 0) as dang_xu_ly,
        COALESCE(SUM(status = 'da_giai_quyet'), 0) as da_giai_quyet
      FROM Incidents
    `),
        db.query(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(status = 'cho_duyet'), 0) as cho_duyet,
        COALESCE(SUM(status = 'da_duyet'), 0) as da_duyet,
        COALESCE(SUM(status = 'tu_choi'), 0) as tu_choi
      FROM Bookings
    `),
      ]);

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
