const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Không có token, vui lòng đăng nhập" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }

  const userId = Number(decoded.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ message: "Token không hợp lệ" });
  }

  try {
    // Đọc role và trạng thái mới nhất để role đã bị đổi/khóa có hiệu lực ngay,
    // không tiếp tục dùng quyền cũ còn nằm trong JWT đến hết hạn.
    const [users] = await db.query(
      `SELECT u.id, u.role_id, r.name AS role
       FROM Users u
       JOIN Roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.is_active = 1
       LIMIT 1`,
      [userId],
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Tài khoản không còn hoạt động" });
    }

    req.user = {
      ...decoded,
      id: users[0].id,
      role_id: users[0].role_id,
      role: users[0].role,
    };
    return next();
  } catch (error) {
    console.error("Lỗi xác thực tài khoản:", error);
    return res.status(500).json({ message: "Không thể xác thực tài khoản" });
  }
};

module.exports = authMiddleware;
