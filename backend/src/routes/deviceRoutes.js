const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", deviceController.getAll);
router.get("/stats", deviceController.getStats);
router.get("/types", deviceController.getTypes);
router.get("/room/:roomId", deviceController.getByRoom);
router.get("/:id", deviceController.getById);
router.post("/", deviceController.create);
router.put("/:id", deviceController.update);
router.patch("/:id/status", deviceController.updateStatus);
router.delete("/:id", deviceController.delete);

module.exports = router;
