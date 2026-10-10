const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Controller tự lọc: admin/kỹ thuật viên xem tất cả,
// các vai trò khác chỉ xem lượt đặt của chính mình.
router.get("/", bookingController.getAll);

// Chỉ quản trị viên và kỹ thuật viên được xem thống kê
router.get(
  "/stats",
  requireRole("admin", "ky_thuat_vien"),
  bookingController.getStats,
);

// Người đã đăng nhập được gửi yêu cầu đặt phòng
router.post("/", bookingController.create);

// Chỉ quản trị viên được duyệt, từ chối, hủy hoặc xóa lượt đặt
router.patch(
  "/:id/status",
  requireRole("admin"),
  bookingController.updateStatus,
);
router.delete("/:id", requireRole("admin"), bookingController.delete);

module.exports = router;
