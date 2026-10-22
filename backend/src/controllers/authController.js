const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const LogModel = require("../models/logModel");
const {
  passwordVersion,
  createResetToken,
  readResetUserId,
  verifyResetToken,
  isMailConfigured,
  sendResetEmail,
} = require("../services/passwordResetService");

const RESET_MESSAGE =
  "Nếu email thuộc tài khoản đang hoạt động, bạn sẽ nhận được liên kết đặt lại mật khẩu.";
const resetRequestsByIp = new Map();
const resetRequestsByEmail = new Map();
const RESET_WINDOW_MS = 15 * 60 * 1000;

// Giới hạn yêu cầu để tránh gửi mail liên tục. Không lưu mật khẩu hay token.
const resetCleanup = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of resetRequestsByIp) {
    if (now - entry.startedAt >= RESET_WINDOW_MS) resetRequestsByIp.delete(ip);
  }
  for (const [email, sentAt] of resetRequestsByEmail) {
    if (now - sentAt >= 60 * 1000) resetRequestsByEmail.delete(email);
  }
}, RESET_WINDOW_MS);
resetCleanup.unref();

const emitLogCreated = (req, id, action) => {
  const io = req.app.get("io");
  if (!io || !id) return;
  const payload = { id, action };
  io.to("role:admin").emit("activity_log_created", payload);
  io.to("role:ky_thuat_vien").emit("activity_log_created", payload);
};

const recordAuthLog = async (req, data) => {
  try {
    const logId = await LogModel.create({ ...data, ip_address: req.ip });
    emitLogCreated(req, logId, data.action);
    return logId;
  } catch (error) {
    console.error("Không thể ghi nhật ký xác thực:", error.message);
    return null;
  }
};

// Đăng nhập
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      !username.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    const cleanUsername = username.trim();

    const [users] = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.username = ? AND u.is_active = 1`,
      [cleanUsername],
    );

    if (users.length === 0) {
      await recordAuthLog(req, {
        user_id: null,
        action: "USER_LOGIN_FAILED",
        entity_type: "User",
        entity_id: null,
        details: { username: cleanUsername, reason: "account_not_found" },
      });
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      await recordAuthLog(req, {
        user_id: user.id,
        action: "USER_LOGIN_FAILED",
        entity_type: "User",
        entity_id: user.id,
        details: { username: user.username, reason: "invalid_password" },
      });
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role_name,
        pwdv: passwordVersion(user.password_hash),
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    await recordAuthLog(req, {
      user_id: user.id,
      action: "USER_LOGIN",
      entity_type: "User",
      entity_id: user.id,
      details: { username: user.username },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name,
        role_id: user.role_id,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};

const forgotPassword = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Vui lòng nhập email hợp lệ." });
  }
  if (!isMailConfigured()) {
    return res.status(503).json({ message: "Hệ thống chưa cấu hình email gửi mật khẩu." });
  }

  const now = Date.now();
  const ip = req.ip;
  let attempts = resetRequestsByIp.get(ip);
  if (!attempts || now - attempts.startedAt >= RESET_WINDOW_MS) {
    attempts = { startedAt: now, count: 0 };
  }
  attempts.count += 1;
  resetRequestsByIp.set(ip, attempts);
  if (attempts.count > 5) {
    return res.status(429).json({ message: "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau." });
  }

  if (now - (resetRequestsByEmail.get(email) || 0) < 60 * 1000) {
    return res.json({ message: RESET_MESSAGE });
  }
  resetRequestsByEmail.set(email, now);

  try {
    const [users] = await pool.query(
      "SELECT id, email, password_hash FROM Users WHERE email = ? AND is_active = 1 LIMIT 1",
      [email],
    );
    if (users.length > 0) {
      await sendResetEmail(users[0].email, createResetToken(users[0]));
      await recordAuthLog(req, {
        user_id: users[0].id,
        action: "PASSWORD_RESET_REQUESTED",
        entity_type: "User",
        entity_id: users[0].id,
        details: null,
      });
    }
    return res.json({ message: RESET_MESSAGE });
  } catch (error) {
    resetRequestsByEmail.delete(email);
    console.error("Không thể gửi email đặt lại mật khẩu:", error);
    return res.status(503).json({ message: "Không thể gửi email lúc này. Vui lòng thử lại sau." });
  }
};

const resetPassword = async (req, res) => {
  const { token, new_password: newPassword, confirm_password: confirmPassword } = req.body || {};
  if (
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    Buffer.byteLength(newPassword, "utf8") > 72 ||
    newPassword !== confirmPassword
  ) {
    return res.status(400).json({
      message: "Mật khẩu cần từ 8 ký tự, tối đa 72 byte và hai ô phải trùng nhau.",
    });
  }

  const userId = readResetUserId(token);
  if (!userId) {
    return res.status(400).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn." });
  }

  try {
    const [users] = await pool.query(
      "SELECT id, password_hash FROM Users WHERE id = ? AND is_active = 1 LIMIT 1",
      [userId],
    );
    if (!users.length || !verifyResetToken(token, users[0])) {
      return res.status(400).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.query(
      "UPDATE Users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND password_hash = ? AND is_active = 1",
      [newHash, userId, users[0].password_hash],
    );
    if (result.affectedRows !== 1) {
      return res.status(400).json({ message: "Liên kết không hợp lệ hoặc đã được sử dụng." });
    }

    await recordAuthLog(req, {
      user_id: userId,
      action: "PASSWORD_RESET_COMPLETED",
      entity_type: "User",
      entity_id: userId,
      details: null,
    });
    req.app.get("io")?.to(`user:${userId}`).emit("account_changed");
    return res.json({ message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(400).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn." });
    }
    console.error("Lỗi đặt lại mật khẩu:", error);
    return res.status(500).json({ message: "Không thể đặt lại mật khẩu lúc này." });
  }
};

// Đăng ký
const register = async (req, res) => {
  try {
    // Không lấy role_id từ request để người đăng ký
    // không thể tự cấp cho mình quyền quản trị.
    const { full_name, username, email, password, phone } = req.body;

    if (
      typeof full_name !== "string" ||
      typeof username !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !full_name.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    const cleanFullName = full_name.trim();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim();
    const cleanPhone =
      typeof phone === "string" && phone.trim() ? phone.trim() : null;

    const [existingUsername] = await pool.query(
      "SELECT id FROM Users WHERE username = ?",
      [cleanUsername],
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({ message: "Username đã được sử dụng!" });
    }

    const [existingEmail] = await pool.query(
      "SELECT id FROM Users WHERE email = ?",
      [cleanEmail],
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [lecturerRoles] = await pool.query(
      "SELECT id FROM Roles WHERE name = 'giang_vien' LIMIT 1",
    );

    if (lecturerRoles.length === 0) {
      return res.status(500).json({
        message: "Hệ thống chưa cấu hình vai trò Giảng viên.",
      });
    }

    // Tài khoản tự đăng ký luôn là Giảng viên. Chỉ admin mới được đổi vai trò.
    const [result] = await pool.query(
      `INSERT INTO Users
        (role_id, username, email, password_hash, full_name, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        lecturerRoles[0].id,
        cleanUsername,
        cleanEmail,
        passwordHash,
        cleanFullName,
        cleanPhone,
      ],
    );

    await recordAuthLog(req, {
      user_id: result.insertId,
      action: "USER_REGISTER",
      entity_type: "User",
      entity_id: result.insertId,
      details: { username: cleanUsername, email: cleanEmail },
    });

    return res
      .status(201)
      .json({ message: "Đăng ký thành công! Vui lòng đăng nhập." });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ message: "Username hoặc email đã được sử dụng!" });
    }

    return res.status(500).json({ message: "Lỗi server!" });
  }
};

// Lấy thông tin user hiện tại
const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.phone,
              u.role_id, r.name AS role_name
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.is_active = 1`,
      [req.user.id],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy user!" });
    }

    const user = users[0];
    return res.json({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role_id: user.role_id,
      role: user.role_name,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};

const logout = async (req, res) => {
  await recordAuthLog(req, {
    user_id: req.user.id,
    action: "USER_LOGOUT",
    entity_type: "User",
    entity_id: req.user.id,
    details: null,
  });
  return res.json({ message: "Đăng xuất thành công." });
};

module.exports = { login, register, getMe, logout, forgotPassword, resetPassword };
