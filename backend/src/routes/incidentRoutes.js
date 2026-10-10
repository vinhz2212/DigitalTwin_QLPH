const express = require("express");
const router = express.Router();

const incidentController = require("../controllers/incidentController");
const maintenanceController = require("../controllers/maintenanceController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

router.use(authMiddleware);

// Mọi người có thể gửi báo cáo; chỉ admin/kỹ thuật viên xem và xử lý.
router.get(
  "/incidents",
  requireRole("admin", "ky_thuat_vien"),
  incidentController.getAll,
);
router.get(
  "/incidents/stats",
  requireRole("admin", "ky_thuat_vien"),
  incidentController.getStats,
);
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

// Chỉ admin/kỹ thuật viên xem và quản lý bảo trì.
router.get(
  "/maintenance",
  requireRole("admin", "ky_thuat_vien"),
  maintenanceController.getAll,
);
router.get(
  "/maintenance/stats",
  requireRole("admin", "ky_thuat_vien"),
  maintenanceController.getStats,
);

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
