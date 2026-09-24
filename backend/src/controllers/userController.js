const bcrypt = require("bcryptjs");
const UserModel = require("../models/userModel");

const userController = {
  getAll: async (req, res) => {
    try {
      const users = await UserModel.getAll();
      const safeUsers = users.map(({ password_hash, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  getRoles: async (req, res) => {
    try {
      const roles = await UserModel.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { role_id, username, email, password, full_name, phone } = req.body;
      const password_hash = await bcrypt.hash(password, 10);
      const id = await UserModel.create({
        role_id,
        username,
        email,
        password_hash,
        full_name,
        phone,
      });
      res.status(201).json({ message: "Tạo người dùng thành công", id });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res
          .status(400)
          .json({ message: "Username hoặc email đã tồn tại!" });
      }
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      await UserModel.update(req.params.id, req.body);
      res.json({ message: "Cập nhật thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { password } = req.body;
      const password_hash = await bcrypt.hash(password, 10);
      await UserModel.updatePassword(req.params.id, password_hash);
      res.json({ message: "Đặt lại mật khẩu thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Cập nhật hồ sơ cá nhân (dùng cho Settings page)
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { full_name, email, phone } = req.body;

      if (!full_name || !email) {
        return res.status(400).json({ message: "Tên và email không được để trống" });
      }

      await UserModel.updateProfile(userId, { full_name, email, phone });

      // Trả về data mới
      const updated = await UserModel.findById(userId);
      const { password_hash, ...safeUser } = updated;
      res.json({ message: "Cập nhật hồ sơ thành công", user: safeUser });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email này đã được sử dụng!" });
      }
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Đổi mật khẩu cá nhân (dùng cho Settings page)
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ thông tin" });
      }
      if (new_password.length < 6) {
        return res.status(400).json({ message: "Mật khẩu mới phải ít nhất 6 ký tự" });
      }

      // Xác minh mật khẩu hiện tại
      const currentHash = await UserModel.getPasswordHash(userId);
      const isValid = await bcrypt.compare(current_password, currentHash);
      if (!isValid) {
        return res.status(400).json({ message: "Mật khẩu hiện tại không đúng!" });
      }

      const newHash = await bcrypt.hash(new_password, 10);
      await UserModel.updatePassword(userId, newHash);
      res.json({ message: "Đổi mật khẩu thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      if (req.params.id == req.user.id) {
        return res.status(400).json({ message: "Không thể xóa tài khoản đang đăng nhập!" });
      }
      await UserModel.delete(req.params.id);
      res.json({ message: "Xóa người dùng thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = userController;
