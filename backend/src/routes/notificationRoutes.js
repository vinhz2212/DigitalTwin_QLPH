const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/auth");

// GET /api/notifications — Lấy tất cả thông báo
router.get("/", authMiddleware, notificationController.getAll);

// PATCH /api/notifications/read-all — Đánh dấu tất cả đã đọc
router.patch("/read-all", authMiddleware, notificationController.markAllRead);

// PATCH /api/notifications/:id/read — Đánh dấu 1 thông báo đã đọc
router.patch("/:id/read", authMiddleware, notificationController.markRead);

// DELETE /api/notifications/all — Xóa tất cả
router.delete("/all", authMiddleware, notificationController.deleteAll);

// DELETE /api/notifications/:id — Xóa 1 thông báo
router.delete("/:id", authMiddleware, notificationController.delete);

module.exports = router;
