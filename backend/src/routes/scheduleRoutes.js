const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/scheduleController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", scheduleController.getAll);
router.get("/room/:roomId", scheduleController.getByRoom);
router.post("/", scheduleController.create);
router.put("/:id", scheduleController.update);
router.delete("/:id", scheduleController.delete);

module.exports = router;
