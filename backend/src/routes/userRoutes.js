const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Quản lý users (admin)
router.get("/", userController.getAll);
router.get("/roles", userController.getRoles);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.patch("/:id/password", userController.resetPassword);
router.delete("/:id", userController.delete);

// Settings cá nhân (user hiện tại)
router.put("/me/profile", userController.updateProfile);
router.put("/me/password", userController.changePassword);

module.exports = router;
