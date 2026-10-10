const express = require("express");
const router = express.Router();

const sensorController = require("../controllers/sensorController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Tất cả routes yêu cầu đăng nhập
router.use(authMiddleware);

// Chỉ admin và kỹ thuật viên được ghi dữ liệu cảm biến
router.post(
  "/snapshot",
  requireRole("admin", "ky_thuat_vien"),
  sensorController.saveSnapshot,
);

// Người đã đăng nhập được xem dữ liệu
router.get("/", sensorController.getAll);
router.get("/:roomId/history", sensorController.getHistory);
router.get("/:roomId", sensorController.getByRoom);

module.exports = router;
