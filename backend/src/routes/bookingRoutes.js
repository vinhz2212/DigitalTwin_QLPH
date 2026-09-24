const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", bookingController.getAll);
router.get("/stats", bookingController.getStats);
router.post("/", bookingController.create);
router.patch("/:id/status", bookingController.updateStatus);
router.delete("/:id", bookingController.delete);

module.exports = router;
