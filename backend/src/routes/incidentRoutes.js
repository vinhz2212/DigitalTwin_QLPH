const express = require("express");
const router = express.Router();

const incidentController = require("../controllers/incidentController");
const maintenanceController = require("../controllers/maintenanceController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Sự cố: mọi người xem và gửi báo cáo; admin/kỹ thuật viên xử lý
router.get("/incidents", incidentController.getAll);
router.get("/incidents/stats", incidentController.getStats);
router.post("/incidents", incidentController.create);

router.patch(
  "/incidents/:id/status",
  requireRole("admin", "ky_thuat_vien"),
  incidentController.updateStatus,
);

router.delete(
  "/incidents/:id",
  requireRole("admin"),
  incidentController.delete,
);

// Bảo trì: mọi người xem; admin/kỹ thuật viên quản lý
router.get("/maintenance", maintenanceController.getAll);
router.get("/maintenance/stats", maintenanceController.getStats);

router.post(
  "/maintenance",
  requireRole("admin", "ky_thuat_vien"),
  maintenanceController.create,
);
router.patch(
  "/maintenance/:id/status",
  requireRole("admin", "ky_thuat_vien"),
  maintenanceController.updateStatus,
);
router.delete(
  "/maintenance/:id",
  requireRole("admin"),
  maintenanceController.delete,
);

module.exports = router;
