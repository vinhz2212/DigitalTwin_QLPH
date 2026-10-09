const LogModel = require("../models/logModel");

const logController = {
  getAll: async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const logs = await LogModel.getAll(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({
        message: "Lỗi server",
        error: error.message,
      });
    }
  },

  remove: async (req, res) => {
    try {
      // Chỉ tài khoản admin được phép xóa nhật ký
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          message: "Chỉ quản trị viên mới được xóa nhật ký.",
        });
      }

      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "ID nhật ký không hợp lệ.",
        });
      }

      const deleted = await LogModel.removeById(id);

      if (!deleted) {
        return res.status(404).json({
          message: "Không tìm thấy nhật ký.",
        });
      }

      // Ghi lại việc xóa để vẫn có dấu vết quản trị
      await LogModel.create({
        user_id: req.user.id,
        action: "ACTIVITY_LOG_DELETED",
        entity_type: "ActivityLog",
        entity_id: id,
        details: { deletedBy: req.user.id },
        ip_address: req.ip,
      });

      return res.json({ message: "Đã xóa nhật ký." });
    } catch (error) {
      return res.status(500).json({
        message: "Lỗi server khi xóa nhật ký.",
        error: error.message,
      });
    }
  },
};

module.exports = logController;
