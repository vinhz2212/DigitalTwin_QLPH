const express = require("express");
const router = express.Router();

const logController = require("../controllers/logController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/", logController.getAll);
router.delete("/:id", logController.remove);

module.exports = router;
