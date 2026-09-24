const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");

const authController = {
  // Đăng nhập
  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ message: "Vui lòng nhập username và mật khẩu" });
      }

      // Tìm user
      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res
          .status(401)
          .json({ message: "Username hoặc mật khẩu không đúng" });
      }

      // Kiểm tra mật khẩu
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Username hoặc mật khẩu không đúng" });
      }

      // Tạo token
      const token = jwt.sign(
        { id: user.id, role: user.role_name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.json({
        message: "Đăng nhập thành công",
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          email: user.email,
          role: user.role_name,
          avatar: user.avatar,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lấy thông tin user hiện tại
  getMe: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      if (!user)
        return res.status(404).json({ message: "Không tìm thấy user" });

      res.json({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name,
        avatar: user.avatar,
      });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = authController;
