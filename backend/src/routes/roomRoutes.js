const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", roomController.getAll);
router.get("/stats", roomController.getStats);
router.get("/available", roomController.getAvailable);
router.get("/buildings", roomController.getBuildings);
router.get("/buildings/:buildingId/floors", roomController.getFloors);
router.get("/:id", roomController.getById);
router.post("/", roomController.create);
router.put("/:id", roomController.update);
router.patch("/:id/status", roomController.updateStatus);
router.delete("/:id", roomController.delete);

module.exports = router;
