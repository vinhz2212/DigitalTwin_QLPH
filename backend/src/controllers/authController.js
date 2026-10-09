const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Đăng nhập
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    const [users] = await pool.query(
      `SELECT u.*, r.name AS role_name
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.username = ? AND u.is_active = 1`,
      [username.trim()],
    );

    if (users.length === 0) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    await pool.query(
      "INSERT INTO ActivityLogs (user_id, action, entity_type) VALUES (?, ?, ?)",
      [user.id, "USER_LOGIN", "User"],
    );

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

    // 2 là vai trò Giảng viên theo Roles trong database.
    const [result] = await pool.query(
      `INSERT INTO Users
        (role_id, username, email, password_hash, full_name, phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [2, cleanUsername, cleanEmail, passwordHash, cleanFullName, cleanPhone],
    );

    await pool.query(
      `INSERT INTO ActivityLogs
        (user_id, action, entity_type, entity_id)
       VALUES (?, ?, ?, ?)`,
      [result.insertId, "USER_REGISTER", "User", result.insertId],
    );

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

    return res.json(users[0]);
  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    return res.status(500).json({ message: "Lỗi server!" });
  }
};

module.exports = { login, register, getMe };
