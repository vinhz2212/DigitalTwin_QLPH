const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/chat", aiController.chat);
router.post("/analyze-incident", aiController.analyzeIncident);
router.post("/suggest-maintenance", aiController.suggestMaintenance);
router.post("/find-room", aiController.findRoom);

module.exports = router;
