const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const db = require("../config/database");
const {
  passwordVersion,
  isMailConfigured,
} = require("../services/passwordResetService");
const {
  createVerificationCode,
  sendVerificationEmail,
} = require("../services/emailVerificationService");

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
      const currentUser = await UserModel.findById(req.params.id);
      if (!currentUser) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản." });
      }
      const emailChanged = currentUser.email.toLowerCase() !==
        String(req.body.email || "").trim().toLowerCase();
      await UserModel.update(req.params.id, req.body, emailChanged);
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${req.params.id}`).emit("account_changed");
      }
      res.json({
        message: emailChanged
          ? "Đã đổi email. Người dùng cần xác minh email mới trước khi đăng nhập lại."
          : "Cập nhật thành công",
        verificationRequired: emailChanged,
      });
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
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ message: "Vui lòng nhập email hợp lệ." });
      }
      const currentUser = await UserModel.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản." });
      }
      const emailChanged = currentUser.email.toLowerCase() !== cleanEmail;
      if (emailChanged && !isMailConfigured()) {
        return res.status(503).json({ message: "Hệ thống chưa cấu hình email xác minh." });
      }

      if (emailChanged) {
        const verification = createVerificationCode(cleanEmail);
        const connection = await db.getConnection();
        try {
          await connection.beginTransaction();
          await UserModel.updateProfile(
            userId,
            { full_name: full_name.trim(), email: cleanEmail, phone },
            verification,
            connection,
          );
          try {
            await sendVerificationEmail(cleanEmail, verification.code);
          } catch (error) {
            error.emailDeliveryFailed = true;
            throw error;
          }
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          connection.release();
        }
      } else {
        await UserModel.updateProfile(userId, {
          full_name: full_name.trim(), email: cleanEmail, phone,
        });
      }

      // Trả về data mới
      const updated = await UserModel.findById(userId);
      const { password_hash, ...safeUser } = updated;
      res.json({
        message: emailChanged
          ? "Đã gửi mã xác minh đến email mới. Vui lòng nhập mã trước khi đăng nhập lại."
          : "Cập nhật hồ sơ thành công",
        verificationRequired: emailChanged,
        user: safeUser,
      });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ message: "Email này đã được sử dụng!" });
      }
      if (error.emailDeliveryFailed) {
        return res.status(503).json({ message: "Không thể gửi email xác minh lúc này. Vui lòng thử lại." });
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
      const token = jwt.sign(
        { id: userId, role: req.user.role, pwdv: passwordVersion(newHash) },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );
      res.json({ message: "Đổi mật khẩu thành công", token });
    } catch (error) {
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Mã tài khoản không hợp lệ." });
      }
      if (id === Number(req.user.id)) {
        return res.status(400).json({ message: "Không thể xóa tài khoản đang đăng nhập!" });
      }
      const deleted = await UserModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: "Tài khoản không tồn tại hoặc đã bị xóa." });
      }
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${id}`).emit("account_changed");
      }
      res.json({ message: "Đã xóa vĩnh viễn tài khoản và dữ liệu riêng liên quan." });
    } catch (error) {
      console.error("Không thể xóa tài khoản:", error);
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({ message: "Tài khoản còn dữ liệu liên kết chưa được xử lý. Vui lòng kiểm tra cấu trúc cơ sở dữ liệu." });
      }
      res.status(500).json({ message: "Không thể xóa tài khoản lúc này." });
    }
  },
};

module.exports = userController;
