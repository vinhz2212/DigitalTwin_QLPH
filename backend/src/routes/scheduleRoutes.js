const express = require("express");
const router = express.Router();

const scheduleController = require("../controllers/scheduleController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Người đã đăng nhập được xem lịch
router.get("/", scheduleController.getAll);
router.get("/room/:roomId", scheduleController.getByRoom);

// Chỉ quản trị viên được thêm, sửa, xóa lịch
router.post("/", requireRole("admin"), scheduleController.create);
router.put("/:id", requireRole("admin"), scheduleController.update);
router.delete("/:id", requireRole("admin"), scheduleController.delete);

module.exports = router;
