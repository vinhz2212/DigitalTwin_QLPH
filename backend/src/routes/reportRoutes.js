const express = require("express");
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

router.use(authMiddleware, requireRole("admin", "ky_thuat_vien"));
router.get("/data", reportController.getData);

module.exports = router;
