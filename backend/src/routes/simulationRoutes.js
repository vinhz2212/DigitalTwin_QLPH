const express = require("express");
const router = express.Router();
const simulationController = require("../controllers/simulationController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/active", simulationController.getActive);
router.post("/trigger", simulationController.triggerIncident);
router.post("/resolve", simulationController.resolveIncident);
router.post("/random", simulationController.randomSimulate);

module.exports = router;
