const express = require("express");
const router = express.Router();

const logController = require("../controllers/logController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);
router.get("/", requireRole("admin", "ky_thuat_vien"), logController.getAll);
router.delete("/:id", requireRole("admin"), logController.remove);

module.exports = router;
