const BookingModel = require("../models/bookingModel");

const bookingController = {
  // Admin/kỹ thuật viên xem tất cả; người dùng khác chỉ xem lượt của mình
  getAll: async (req, res) => {
    try {
      const canViewAll = ["admin", "ky_thuat_vien"].includes(req.user.role);

      const bookings = canViewAll
        ? await BookingModel.getAll()
        : await BookingModel.getByUser(req.user.id);

      res.json(bookings);
    } catch (error) {
      console.error("Lỗi lấy danh sách đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Route thống kê được giới hạn cho admin/kỹ thuật viên
  getStats: async (req, res) => {
    try {
      const stats = await BookingModel.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Lỗi lấy thống kê đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { room_id, date, start_time, end_time, purpose, note } = req.body;

      if (!room_id || !date || !start_time || !end_time) {
        return res.status(400).json({
          message:
            "Vui lòng nhập đầy đủ thông tin: phòng, ngày, giờ bắt đầu và giờ kết thúc.",
        });
      }

      // authMiddleware đã xác thực người dùng trước khi vào controller
      const userId = req.user.id;

      const bookingId = await BookingModel.create({
        user_id: userId,
        room_id,
        date,
        start_time,
        end_time,
        purpose: purpose || "",
        note: note || "",
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("booking_created", {
          id: bookingId,
          room_id,
          user_id: userId,
          date,
        });
      }

      res.status(201).json({
        message: "Tạo yêu cầu đặt phòng thành công",
        id: bookingId,
      });
    } catch (error) {
      console.error("Lỗi tạo đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["cho_duyet", "da_duyet", "tu_choi", "da_huy"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      }

      await BookingModel.updateStatus(id, status);

      const io = req.app.get("io");
      if (io) {
        io.emit("booking_status_changed", { id, status });
      }

      res.json({ message: "Cập nhật trạng thái đặt phòng thành công." });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await BookingModel.delete(id);
      res.json({ message: "Xóa đặt phòng thành công." });
    } catch (error) {
      console.error("Lỗi xóa đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = bookingController;
