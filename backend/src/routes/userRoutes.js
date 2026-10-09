const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Mọi API trong router này yêu cầu đăng nhập.
router.use(authMiddleware);

// Hồ sơ cá nhân: mọi người dùng đã đăng nhập đều được sử dụng.
router.put("/profile", userController.updateProfile);
router.patch("/change-password", userController.changePassword);

// Từ đây trở xuống chỉ admin được quản lý tài khoản.
router.use(requireRole("admin"));

router.get("/", userController.getAll);
router.get("/roles", userController.getRoles);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.patch("/:id/password", userController.resetPassword);
router.delete("/:id", userController.delete);

module.exports = router;
