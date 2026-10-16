const db = require("../config/database");

const emitToUser = (io, userId, payload) => {
  if (io) io.to(`user:${userId}`).emit("notification_created", payload);
};

const createForUser = async ({
  io,
  userId,
  content,
  type = "he_thong",
  severity = "info",
  executor = db,
}) => {
  const [result] = await executor.query(
    `INSERT INTO Notifications (user_id, content, type, severity)
     VALUES (?, ?, ?, ?)`,
    [userId, content, type, severity],
  );

  emitToUser(io, userId, {
    id: result.insertId,
    content,
    type,
    severity,
  });
  return result.insertId;
};

const createForRoles = async ({
  io,
  roles,
  excludeUserIds = [],
  content,
  type = "he_thong",
  severity = "info",
  executor = db,
}) => {
  const roleNames = [...new Set(roles)].filter(Boolean);
  const excludedIds = [...new Set(excludeUserIds.map(Number))].filter(
    (id) => Number.isInteger(id) && id > 0,
  );
  if (roleNames.length === 0) return 0;

  const placeholders = roleNames.map(() => "?").join(", ");
  const exclusionClause = excludedIds.length
    ? `AND u.id NOT IN (${excludedIds.map(() => "?").join(", ")})`
    : "";
  const [result] = await executor.query(
    `INSERT INTO Notifications (user_id, content, type, severity)
     SELECT u.id, ?, ?, ?
     FROM Users u
     JOIN Roles r ON r.id = u.role_id
     WHERE u.is_active = TRUE
       AND r.name IN (${placeholders})
       ${exclusionClause}`,
    [content, type, severity, ...roleNames, ...excludedIds],
  );

  if (io) {
    roleNames.forEach((role) => {
      io.to(`role:${role}`).emit("notification_created", {
        content,
        type,
        severity,
      });
    });
  }
  return result.affectedRows;
};

module.exports = { createForUser, createForRoles };
