const express = require("express");
const router = express.Router();
const energyController = require("../controllers/energyController");
const authMiddleware = require("../middleware/auth");

// GET /api/energy/summary — KPI tổng quan điện năng
router.get("/summary", authMiddleware, energyController.getSummary);

// GET /api/energy/chart?period=day|week|month — Dữ liệu biểu đồ
router.get("/chart", authMiddleware, energyController.getChart);

// GET /api/energy/devices — Phân bổ theo loại thiết bị
router.get("/devices", authMiddleware, energyController.getDeviceBreakdown);

// GET /api/energy/top-rooms — Top phòng tiêu thụ cao
router.get("/top-rooms", authMiddleware, energyController.getTopRooms);

module.exports = router;
