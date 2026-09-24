const express = require("express");
const router = express.Router();
const incidentController = require("../controllers/incidentController");
const maintenanceController = require("../controllers/maintenanceController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Incidents
router.get("/incidents", incidentController.getAll);
router.get("/incidents/stats", incidentController.getStats);
router.post("/incidents", incidentController.create);
router.patch("/incidents/:id/status", incidentController.updateStatus);
router.delete("/incidents/:id", incidentController.delete);

// Maintenance
router.get("/maintenance", maintenanceController.getAll);
router.get("/maintenance/stats", maintenanceController.getStats);
router.post("/maintenance", maintenanceController.create);
router.patch("/maintenance/:id/status", maintenanceController.updateStatus);
router.delete("/maintenance/:id", maintenanceController.delete);

module.exports = router;
