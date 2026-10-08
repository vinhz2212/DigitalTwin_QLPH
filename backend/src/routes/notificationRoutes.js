const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware, notificationController.getAll);
router.get(
  "/unread-count",
  authMiddleware,
  notificationController.getUnreadCount,
);
router.patch("/read-all", authMiddleware, notificationController.markAllRead);
router.patch("/:id/read", authMiddleware, notificationController.markRead);
router.delete("/all", authMiddleware, notificationController.deleteAll);
router.delete("/:id", authMiddleware, notificationController.delete);

module.exports = router;
