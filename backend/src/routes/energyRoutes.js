const express = require("express");
const router = express.Router();
const energyController = require("../controllers/energyController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware, requireRole("admin", "ky_thuat_vien"));

// GET /api/energy/summary — KPI tổng quan điện năng
router.get("/summary", energyController.getSummary);

// GET /api/energy/chart?period=day|week|month — Dữ liệu biểu đồ
router.get("/chart", energyController.getChart);

// GET /api/energy/devices — Phân bổ theo loại thiết bị
router.get("/devices", energyController.getDeviceBreakdown);

// GET /api/energy/top-rooms — Top phòng tiêu thụ cao
router.get("/top-rooms", energyController.getTopRooms);

module.exports = router;
