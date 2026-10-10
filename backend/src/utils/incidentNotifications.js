const db = require("../config/database");

const INCIDENT_LABELS = {
  chay: "cháy",
  mat_dien: "mất điện",
  may_chieu_hong: "máy chiếu hỏng",
  dieu_hoa_hong: "điều hòa hỏng",
  mat_internet: "mất Internet",
  qua_tai: "quá tải",
};

function getNotificationSeverity(severity) {
  if (severity === "nghiem_trong") return "critical";
  if (severity === "cao") return "error";
  if (severity === "thap") return "info";
  return "warning";
}

async function notifyIncident({ io, roomId, type, severity, description }) {
  const [rooms] = await db.query(
    `SELECT code FROM Rooms WHERE id = ? LIMIT 1`,
    [roomId],
  );
  const roomCode = rooms[0]?.code || `ID: ${roomId}`;
  const label = INCIDENT_LABELS[type] || type || "không xác định";
  const content = `Sự cố ${label} tại phòng ${roomCode}${description ? `: ${description}` : "."}`;
  const notificationSeverity = getNotificationSeverity(severity);

  await db.query(
    `
      INSERT INTO Notifications (user_id, content, type, severity)
      SELECT u.id, ?, 'su_co', ?
      FROM Users u
      JOIN Roles r ON r.id = u.role_id
      WHERE u.is_active = TRUE
        AND r.name IN ('admin', 'ky_thuat_vien')
    `,
    [content, notificationSeverity],
  );

  if (io) {
    io.emit("notification_created", {
      type: "su_co",
      severity: notificationSeverity,
      roomCode,
    });
  }
}

module.exports = { notifyIncident };
