const LogModel = require("../models/logModel");

const SENSITIVE_KEY =
  /password|pass_word|token|secret|authorization|cookie|image|file|base64/i;

const sanitizeValue = (value, depth = 0) => {
  if (
    value == null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (depth >= 3) return "[Đã rút gọn]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[Đã ẩn]" : sanitizeValue(item, depth + 1),
      ]),
    );
  }
  return String(value);
};

const getRule = (method, path) => {
  const rules = [
    ["PUT", /^\/api\/users\/profile$/, "PROFILE_UPDATED", "User", true],
    [
      "PATCH",
      /^\/api\/users\/change-password$/,
      "PASSWORD_CHANGED",
      "User",
      true,
    ],
    ["POST", /^\/api\/users$/, "USER_CREATED", "User"],
    ["PUT", /^\/api\/users\/(\d+)$/, "USER_UPDATED", "User"],
    ["PATCH", /^\/api\/users\/(\d+)\/password$/, "USER_PASSWORD_RESET", "User"],
    ["DELETE", /^\/api\/users\/(\d+)$/, "USER_DELETED", "User"],

    ["POST", /^\/api\/rooms$/, "ROOM_CREATED", "Room"],
    ["PUT", /^\/api\/rooms\/(\d+)$/, "ROOM_UPDATED", "Room"],
    ["PATCH", /^\/api\/rooms\/(\d+)\/status$/, "ROOM_STATUS_UPDATED", "Room"],
    ["DELETE", /^\/api\/rooms\/(\d+)$/, "ROOM_DELETED", "Room"],

    ["POST", /^\/api\/devices$/, "DEVICE_CREATED", "Device"],
    ["PUT", /^\/api\/devices\/(\d+)$/, "DEVICE_UPDATED", "Device"],
    [
      "PATCH",
      /^\/api\/devices\/(\d+)\/status$/,
      "DEVICE_STATUS_UPDATED",
      "Device",
    ],
    ["DELETE", /^\/api\/devices\/(\d+)$/, "DEVICE_DELETED", "Device"],

    ["POST", /^\/api\/incidents$/, "INCIDENT_CREATED", "Incident"],
    [
      "PATCH",
      /^\/api\/incidents\/(\d+)\/status$/,
      "INCIDENT_STATUS_UPDATED",
      "Incident",
    ],
    ["DELETE", /^\/api\/incidents\/(\d+)$/, "INCIDENT_DELETED", "Incident"],

    ["POST", /^\/api\/maintenance$/, "MAINTENANCE_CREATED", "Maintenance"],
    [
      "PATCH",
      /^\/api\/maintenance\/(\d+)\/status$/,
      "MAINTENANCE_STATUS_UPDATED",
      "Maintenance",
    ],
    [
      "DELETE",
      /^\/api\/maintenance\/(\d+)$/,
      "MAINTENANCE_DELETED",
      "Maintenance",
    ],

    ["POST", /^\/api\/schedules$/, "SCHEDULE_CREATED", "Schedule"],
    ["PUT", /^\/api\/schedules\/(\d+)$/, "SCHEDULE_UPDATED", "Schedule"],
    ["DELETE", /^\/api\/schedules\/(\d+)$/, "SCHEDULE_DELETED", "Schedule"],

    ["POST", /^\/api\/bookings$/, "BOOKING_CREATED", "Booking"],
    [
      "PATCH",
      /^\/api\/bookings\/(\d+)\/status$/,
      "BOOKING_STATUS_UPDATED",
      "Booking",
    ],
    ["DELETE", /^\/api\/bookings\/(\d+)$/, "BOOKING_DELETED", "Booking"],

    [
      "POST",
      /^\/api\/sensors\/snapshot$/,
      "SENSOR_SNAPSHOT_CREATED",
      "SensorReading",
    ],
    ["POST", /^\/api\/simulation\/trigger$/, "SIMULATE_INCIDENT", "Incident"],
    ["POST", /^\/api\/simulation\/random$/, "SIMULATE_INCIDENT", "Incident"],
    ["POST", /^\/api\/simulation\/resolve$/, "INCIDENT_RESOLVED", "Incident"],
  ];

  for (const [ruleMethod, pattern, action, entityType, ownUser] of rules) {
    if (method !== ruleMethod) continue;
    const match = path.match(pattern);
    if (match) return { action, entityType, pathId: match[1], ownUser };
  }
  return null;
};

const getResponseEntityId = (payload) => {
  if (!payload || typeof payload !== "object") return null;
  const candidates = [
    payload.id,
    payload.incidentId,
    payload.bookingId,
    payload.maintenanceId,
    payload.scheduleId,
    payload.room?.id,
    payload.device?.id,
    payload.user?.id,
  ];
  const id = candidates
    .map(Number)
    .find((value) => Number.isInteger(value) && value > 0);
  return id || null;
};

const getRequestEntityId = (body) => {
  if (!body || typeof body !== "object") return null;
  const candidates = [body.id, body.incident_id, body.entity_id];
  const id = candidates
    .map(Number)
    .find((value) => Number.isInteger(value) && value > 0);
  return id || null;
};

const auditLog = (req, res, next) => {
  const path = req.originalUrl.split("?")[0];
  const rule = getRule(req.method, path);
  if (!rule) return next();

  let responsePayload;
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    responsePayload = payload;
    return originalJson(payload);
  };

  res.once("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 400 || !req.user?.id) return;

    const pathId = Number(rule.pathId);
    const entityId = rule.ownUser
      ? Number(req.user.id)
      : Number.isInteger(pathId) && pathId > 0
        ? pathId
        : getResponseEntityId(responsePayload) || getRequestEntityId(req.body);

    LogModel.create({
      user_id: req.user.id,
      action: rule.action,
      entity_type: rule.entityType,
      entity_id: entityId,
      details: {
        method: req.method,
        path,
        data: sanitizeValue(req.body || {}),
      },
      ip_address: req.ip,
    })
      .then((logId) => {
        req.app.get("io")?.to("role:admin").emit("activity_log_created", {
          id: logId,
          action: rule.action,
        });
        req.app
          .get("io")
          ?.to("role:ky_thuat_vien")
          .emit("activity_log_created", { id: logId, action: rule.action });
      })
      .catch((error) => {
        console.error("Không thể ghi nhật ký hoạt động:", error.message);
      });
  });

  return next();
};

module.exports = auditLog;
