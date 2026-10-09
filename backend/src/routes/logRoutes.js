const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.get("/", logController.getAll);
router.delete("/:id", logController.remove);

module.exports = router;
