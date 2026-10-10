const BookingModel = require("../models/bookingModel");

const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const isValidTime = (value) =>
  typeof value === "string" &&
  /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);

const timeToSeconds = (value) => {
  const [hours, minutes, seconds = 0] = value.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

const validateBooking = (body = {}) => {
  const roomId = Number(body.room_id);
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return { error: "Vui lòng chọn phòng hợp lệ." };
  }
  if (!isValidDate(body.date)) {
    return { error: "Vui lòng chọn ngày đặt phòng hợp lệ." };
  }
  if (!isValidTime(body.start_time) || !isValidTime(body.end_time)) {
    return { error: "Vui lòng nhập giờ đặt phòng hợp lệ." };
  }
  if (timeToSeconds(body.start_time) >= timeToSeconds(body.end_time)) {
    return { error: "Giờ kết thúc phải sau giờ bắt đầu." };
  }
  if (purpose.length > 255) {
    return { error: "Mục đích đặt phòng không được quá 255 ký tự." };
  }

  return {
    value: {
      room_id: roomId,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      purpose,
      note: note || null,
    },
  };
};

const validateAvailability = async (booking, excludeId = null) => {
  const roomStatus = await BookingModel.getRoomStatus(booking.room_id);
  if (!roomStatus) return "Phòng học không tồn tại.";
  if (["bao_tri", "su_co"].includes(roomStatus)) {
    return "Phòng đang bảo trì hoặc có sự cố, không thể đặt.";
  }

  const bookingConflict = await BookingModel.findRoomConflict({
    ...booking,
    exclude_id: excludeId,
  });
  if (bookingConflict) {
    return "Phòng đã có yêu cầu đặt đang chờ duyệt hoặc đã được duyệt trong khung giờ này.";
  }

  const scheduleConflict = await BookingModel.findScheduleConflict(booking);
  if (scheduleConflict) {
    return `Phòng đã có lịch “${scheduleConflict.subject}” trong khung giờ này.`;
  }

  return null;
};

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
    const validation = validateBooking(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const availabilityError = await validateAvailability(validation.value);
      if (availabilityError) {
        const statusCode = availabilityError === "Phòng học không tồn tại." ? 400 : 409;
        return res.status(statusCode).json({ message: availabilityError });
      }

      // authMiddleware đã xác thực người dùng trước khi vào controller
      const userId = req.user.id;

      const bookingId = await BookingModel.create({
        user_id: userId,
        ...validation.value,
      });

      const io = req.app.get("io");
      if (io) {
        io.emit("booking_created", {
          id: bookingId,
          room_id: validation.value.room_id,
          user_id: userId,
          date: validation.value.date,
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Mã lượt đặt phòng không hợp lệ." });
    }

    try {
      const booking = await BookingModel.getById(id);
      if (!booking) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu đặt phòng." });
      }

      const { status } = req.body;

      const validStatuses = ["cho_duyet", "da_duyet", "tu_choi", "da_huy"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ." });
      }

      if (status === "da_duyet") {
        const availabilityError = await validateAvailability(booking, id);
        if (availabilityError) {
          return res.status(409).json({ message: availabilityError });
        }
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
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Mã lượt đặt phòng không hợp lệ." });
    }

    try {
      const affectedRows = await BookingModel.delete(id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu đặt phòng." });
      }
      res.json({ message: "Xóa đặt phòng thành công." });
    } catch (error) {
      console.error("Lỗi xóa đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = bookingController;
