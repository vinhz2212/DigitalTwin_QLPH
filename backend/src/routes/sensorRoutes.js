const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController");
const authMiddleware = require("../middleware/auth");

// POST /api/sensors/snapshot — phải đặt TRƯỚC /:roomId để tránh xung đột route
router.post("/snapshot", authMiddleware, sensorController.saveSnapshot);

// GET /api/sensors — Dữ liệu cảm biến mô phỏng tất cả phòng
router.get("/", authMiddleware, sensorController.getAll);

// GET /api/sensors/:roomId/history — Lịch sử 24h (trước /:roomId)
router.get("/:roomId/history", authMiddleware, sensorController.getHistory);

// GET /api/sensors/:roomId — Dữ liệu cảm biến phòng cụ thể
router.get("/:roomId", authMiddleware, sensorController.getByRoom);

module.exports = router;
