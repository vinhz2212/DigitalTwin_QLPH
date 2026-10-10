const express = require("express");
const router = express.Router();

const roomController = require("../controllers/roomController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Người đã đăng nhập được xem phòng
router.get("/", roomController.getAll);
router.get("/stats", roomController.getStats);
router.get("/available", roomController.getAvailable);
router.get("/buildings", roomController.getBuildings);
router.get("/buildings/:buildingId/floors", roomController.getFloors);
router.get("/:id", roomController.getById);

// Chỉ quản trị viên được tạo, chỉnh sửa hoặc xóa phòng
router.post("/", requireRole("admin"), roomController.create);
router.put("/:id", requireRole("admin"), roomController.update);
router.delete("/:id", requireRole("admin"), roomController.delete);

// Quản trị viên và kỹ thuật viên được cập nhật trạng thái phòng
router.patch(
  "/:id/status",
  requireRole("admin", "ky_thuat_vien"),
  roomController.updateStatus,
);

module.exports = router;
