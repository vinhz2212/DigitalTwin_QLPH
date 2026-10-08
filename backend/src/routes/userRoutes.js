const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// ✅ Profile cá nhân — đặt TRƯỚC /:id để không bị conflict
router.put("/profile", userController.updateProfile);
router.patch("/change-password", userController.changePassword);

// Quản lý users (admin)
router.get("/", userController.getAll);
router.get("/roles", userController.getRoles);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.patch("/:id/password", userController.resetPassword);
router.delete("/:id", userController.delete);

module.exports = router;
