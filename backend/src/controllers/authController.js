const pool = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Đăng nhập
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const [users] = await pool.query(
      `SELECT u.*, r.name as role_name 
       FROM Users u 
       JOIN Roles r ON u.role_id = r.id 
       WHERE u.username = ? AND u.is_active = 1`,
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Tên đăng nhập không tồn tại!" });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không đúng!" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Ghi log
    await pool.query(
      "INSERT INTO ActivityLogs (user_id, action, entity_type) VALUES (?, ?, ?)",
      [user.id, "USER_LOGIN", "User"],
    );

    res.json({
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
    console.error(error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// Đăng ký
const register = async (req, res) => {
  try {
    const { full_name, username, email, password, phone, role_id } = req.body;

    // Validate
    if (!full_name || !username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    // Kiểm tra username đã tồn tại
    const [existingUsername] = await pool.query(
      "SELECT id FROM Users WHERE username = ?",
      [username],
    );
    if (existingUsername.length > 0) {
      return res.status(400).json({ message: "Username đã được sử dụng!" });
    }

    // Kiểm tra email đã tồn tại
    const [existingEmail] = await pool.query(
      "SELECT id FROM Users WHERE email = ?",
      [email],
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Tạo user mới (mặc định role_id = 2 là Giảng viên)
    const [result] = await pool.query(
      `INSERT INTO Users (role_id, username, email, password_hash, full_name, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [role_id || 2, username, email, password_hash, full_name, phone || null],
    );

    // Ghi log
    await pool.query(
      "INSERT INTO ActivityLogs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)",
      [result.insertId, "USER_REGISTER", "User", result.insertId],
    );

    res
      .status(201)
      .json({ message: "Đăng ký thành công! Vui lòng đăng nhập." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

// Lấy thông tin user hiện tại
const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.email, u.phone, r.name as role_name
       FROM Users u
       JOIN Roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id],
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy user!" });
    }
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server!" });
  }
};

module.exports = { login, register, getMe };
