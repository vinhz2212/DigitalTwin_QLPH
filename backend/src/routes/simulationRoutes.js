const express = require("express");
const router = express.Router();

const simulationController = require("../controllers/simulationController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Người đã đăng nhập được xem để trang Tổng quan hiển thị đúng cảnh báo.
router.get("/active", simulationController.getActive);

// Chỉ admin và kỹ thuật viên được thao tác mô phỏng.
router.post(
  "/trigger",
  requireRole("admin", "ky_thuat_vien"),
  simulationController.triggerIncident,
);
router.post(
  "/resolve",
  requireRole("admin", "ky_thuat_vien"),
  simulationController.resolveIncident,
);
router.post(
  "/random",
  requireRole("admin", "ky_thuat_vien"),
  simulationController.randomSimulate,
);

module.exports = router;
