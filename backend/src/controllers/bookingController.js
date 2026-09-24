const BookingModel = require("../models/bookingModel");

const bookingController = {
  // Lấy tất cả danh sách đặt phòng
  getAll: async (req, res) => {
    try {
      const bookings = await BookingModel.getAll();
      res.json(bookings);
    } catch (error) {
      console.error("Lỗi lấy danh sách đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Lấy thống kê đặt phòng
  getStats: async (req, res) => {
    try {
      const stats = await BookingModel.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Lỗi lấy thống kê đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Tạo yêu cầu đặt phòng mới
  create: async (req, res) => {
    try {
      const { room_id, date, start_time, end_time, purpose, note } = req.body;

      if (!room_id || !date || !start_time || !end_time) {
        return res.status(400).json({
          message: "Vui lòng nhập đầy đủ thông tin (phòng, ngày, giờ bắt đầu, giờ kết thúc)",
        });
      }

      const userId = req.user ? req.user.id : 1; // Fallback nếu chưa qua auth middleware

      const bookingId = await BookingModel.create({
        user_id: userId,
        room_id,
        date,
        start_time,
        end_time,
        purpose: purpose || "",
        note: note || "",
      });

      // Gửi Socket realtime thông báo đặt phòng mới nếu có socket io
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

  // Cập nhật trạng thái (Duyệt/Từ chối/Hủy)
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["cho_duyet", "da_duyet", "tu_choi", "da_huy"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
      }

      await BookingModel.updateStatus(id, status);

      // Gửi Socket realtime thông báo đổi trạng thái
      const io = req.app.get("io");
      if (io) {
        io.emit("booking_status_changed", { id, status });
      }

      res.json({ message: "Cập nhật trạng thái đặt phòng thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  // Xóa đặt phòng
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      await BookingModel.delete(id);
      res.json({ message: "Xóa đặt phòng thành công" });
    } catch (error) {
      console.error("Lỗi xóa đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = bookingController;
