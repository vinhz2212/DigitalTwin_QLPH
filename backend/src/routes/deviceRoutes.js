const express = require("express");
const router = express.Router();

const deviceController = require("../controllers/deviceController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Người đã đăng nhập được xem dữ liệu để trang Tổng quan/Digital Twin hoạt động.
router.get("/", deviceController.getAll);
router.get("/stats", deviceController.getStats);
router.get("/types", deviceController.getTypes);
router.get("/room/:roomId", deviceController.getByRoom);
router.get("/:id", deviceController.getById);

// Chỉ quản trị viên và kỹ thuật viên được thay đổi thiết bị.
router.post("/", requireRole("admin", "ky_thuat_vien"), deviceController.create);
router.put("/:id", requireRole("admin", "ky_thuat_vien"), deviceController.update);
router.patch(
  "/:id/status",
  requireRole("admin", "ky_thuat_vien"),
  deviceController.updateStatus,
);
router.delete("/:id", requireRole("admin", "ky_thuat_vien"), deviceController.delete);

module.exports = router;
