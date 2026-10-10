const express = require("express");
const router = express.Router();

const sensorController = require("../controllers/sensorController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Chỉ admin/kỹ thuật viên được truy cập dữ liệu cảm biến và lưu snapshot.
router.use(authMiddleware, requireRole("admin", "ky_thuat_vien"));

// Chỉ admin và kỹ thuật viên được ghi dữ liệu cảm biến
router.post("/snapshot", sensorController.saveSnapshot);

// Admin/kỹ thuật viên được xem dữ liệu
router.get("/", sensorController.getAll);
router.get("/:roomId/history", sensorController.getHistory);
router.get("/:roomId", sensorController.getByRoom);

module.exports = router;
