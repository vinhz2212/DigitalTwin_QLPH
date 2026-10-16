const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const LogModel = require("../models/logModel");

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
      { id: user.id, role: user.role_name },
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

module.exports = { login, register, getMe, logout };
