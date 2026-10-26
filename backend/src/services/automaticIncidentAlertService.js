const db = require("../config/database");

const AUTO_ALERT_PROMPT = "Cảnh báo tự động khi có sự cố";
const AUTO_RESOLUTION_PROMPT = "Thông báo tự động khi sự cố được giải quyết";
const AUTO_POWER_TYPES = new Set(["chay", "may_chieu_hong", "dieu_hoa_hong"]);

const buildAutomaticAlert = ({ type, roomCode }) => {
  if (type === "chay") {
    return `Trợ lý AI phát hiện sự cố cháy tại phòng ${roomCode}. Tôi đã đưa nguồn điện của cả phòng về trạng thái ngắt trên hệ thống và tắt các thiết bị. Vui lòng kiểm tra, xử lý sự cố trước khi cấp điện lại.`;
  }

  const label = type === "may_chieu_hong" ? "máy chiếu" : "điều hòa";
  return `Trợ lý AI phát hiện ${label} bị hỏng tại phòng ${roomCode}. Tôi đã ngắt riêng nguồn điện của ${label} trên hệ thống; trạng thái nguồn phòng và các thiết bị khác không đổi do sự cố này. Nguồn thiết bị sẽ được khôi phục sau khi sự cố được giải quyết hoặc bảo trì hoàn tất.`;
};

const insertAlertForActiveUsers = async ({ incidentId, prompt, content, severity, executor }) => {
  await executor.query(
    `INSERT INTO Notifications (user_id, content, type, severity)
     SELECT id, ?, 'su_co', ? FROM Users WHERE is_active = 1`,
    [content, severity],
  );
  await executor.query(
    `INSERT INTO AIAnalysis (user_id, incident_id, prompt, response, type)
     SELECT id, ?, ?, ?, 'chatbot' FROM Users WHERE is_active = 1`,
    [incidentId, prompt, content],
  );
  const [alerts] = await executor.query(
    `SELECT id, user_id, created_at FROM AIAnalysis
     WHERE incident_id = ? AND prompt = ?`,
    [incidentId, prompt],
  );

  return { content, severity, alerts };
};

const recordAutomaticIncidentAlert = async ({
  incidentId,
  roomCode,
  type,
  executor = db,
}) => {
  if (!AUTO_POWER_TYPES.has(type)) return null;

  return insertAlertForActiveUsers({
    incidentId,
    prompt: AUTO_ALERT_PROMPT,
    content: buildAutomaticAlert({ type, roomCode }),
    severity: type === "chay" ? "critical" : "error",
    executor,
  });
};

const recordAutomaticResolutionAlert = async ({
  incidentId,
  roomId,
  roomCode,
  type,
  deviceId,
  executor = db,
}) => {
  if (!AUTO_POWER_TYPES.has(type)) return null;
  const [[originalAlert]] = await executor.query(
    `SELECT id FROM AIAnalysis
     WHERE incident_id = ? AND prompt = ? LIMIT 1`,
    [incidentId, AUTO_ALERT_PROMPT],
  );
  if (!originalAlert) return null;

  const [[room]] = await executor.query(
    "SELECT power_status FROM Rooms WHERE id = ? LIMIT 1",
    [roomId],
  );
  let content;
  if (type === "chay") {
    content = room?.power_status === "co_dien"
      ? `Hệ thống đã giải quyết sự cố cháy tại phòng ${roomCode}. Nguồn điện phòng đã được cấp lại; các thiết bị đủ điều kiện đã được khôi phục theo trạng thái trước sự cố.`
      : `Hệ thống đã ghi nhận sự cố cháy tại phòng ${roomCode} được giải quyết. Nguồn điện phòng chưa được cấp lại vì vẫn còn sự cố chặn cấp điện.`;
  } else {
    let device;
    if (deviceId) {
      const [devices] = await executor.query(
        "SELECT power_status, status FROM Devices WHERE id = ? LIMIT 1",
        [deviceId],
      );
      device = devices[0];
    }
    const label = type === "may_chieu_hong" ? "máy chiếu" : "điều hòa";
    content = device?.power_status !== "co_dien"
      ? `Hệ thống đã ghi nhận sự cố ${label} tại phòng ${roomCode} được giải quyết. Nguồn điện ${label} chưa được cấp lại vì còn sự cố hoặc phiếu bảo trì đang mở.`
      : room?.power_status === "ngat_dien"
        ? `Hệ thống đã giải quyết sự cố ${label} tại phòng ${roomCode}. Nguồn điện ${label} đã được khôi phục trên hệ thống, nhưng thiết bị vẫn tắt vì nguồn điện phòng đang ngắt.`
        : device.status === "hoat_dong"
          ? `Hệ thống đã giải quyết sự cố ${label} tại phòng ${roomCode}. Nguồn điện ${label} đã được cấp lại và thiết bị đã hoạt động trở lại.`
          : `Hệ thống đã giải quyết sự cố ${label} tại phòng ${roomCode}. Nguồn điện ${label} đã được cấp lại; thiết bị hiện đang tắt.`;
  }

  return insertAlertForActiveUsers({
    incidentId,
    prompt: AUTO_RESOLUTION_PROMPT,
    content,
    severity: "info",
    executor,
  });
};

const emitAutomaticIncidentAlert = (io, recorded) => {
  if (!io || !recorded) return;
  for (const alert of recorded.alerts) {
    const recipient = io.to(`user:${alert.user_id}`);
    recipient.emit("notification_created", {
      content: recorded.content,
      type: "su_co",
      severity: recorded.severity,
    });
    recipient.emit("ai_incident_alert", {
      id: alert.id,
      content: recorded.content,
      created_at: alert.created_at,
    });
  }
};

const getAutomaticIncidentAlerts = async (userId, sessionIssuedAt) => {
  const [rows] = await db.query(
    `SELECT id, response AS content, created_at
     FROM AIAnalysis
     WHERE user_id = ? AND prompt IN (?, ?)
       AND created_at >= FROM_UNIXTIME(?)
     ORDER BY id DESC LIMIT 100`,
    [userId, AUTO_ALERT_PROMPT, AUTO_RESOLUTION_PROMPT, Number(sessionIssuedAt) || 0],
  );
  return rows.reverse();
};

module.exports = {
  AUTO_POWER_TYPES,
  recordAutomaticIncidentAlert,
  recordAutomaticResolutionAlert,
  emitAutomaticIncidentAlert,
  getAutomaticIncidentAlerts,
};
