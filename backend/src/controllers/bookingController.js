const BookingModel = require("../models/bookingModel");
const {
  withRoomAvailabilityLock,
} = require("../services/roomAvailabilityService");
const {
  createForRoles,
  createForUser,
} = require("../services/notificationService");

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

const formatDateForNotification = (value) => {
  if (!value) return "không xác định";
  const text = String(value);
  const dateOnly = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;

  if (dateOnly) {
    const [year, month, day] = dateOnly.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? text
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
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

const validateAvailability = async (
  booking,
  excludeId = null,
  executor,
) => {
  const roomStatus = await BookingModel.getRoomStatus(booking.room_id, executor);
  if (!roomStatus) return "Phòng học không tồn tại.";
  if (["bao_tri", "su_co"].includes(roomStatus)) {
    return "Phòng đang bảo trì hoặc có sự cố, không thể đặt.";
  }

  const bookingConflict = await BookingModel.findRoomConflict({
    ...booking,
    exclude_id: excludeId,
  }, executor);
  if (bookingConflict) {
    return "Phòng đã có yêu cầu đặt đang chờ duyệt hoặc đã được duyệt trong khung giờ này.";
  }

  const scheduleConflict = await BookingModel.findScheduleConflict(
    booking,
    executor,
  );
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
      // authMiddleware đã xác thực người dùng trước khi vào controller
      const userId = req.user.id;
      const result = await withRoomAvailabilityLock(
        validation.value.room_id,
        async (connection) => {
          const availabilityError = await validateAvailability(
            validation.value,
            null,
            connection,
          );

          if (availabilityError) return { availabilityError };

          const bookingId = await BookingModel.create(
            {
              user_id: userId,
              ...validation.value,
            },
            connection,
          );
          return { bookingId };
        },
      );

      if (result.availabilityError) {
        return res.status(409).json({ message: result.availabilityError });
      }

      const io = req.app.get("io");
      let booking = null;

      try {
        booking = await BookingModel.getById(result.bookingId);
        await Promise.all([
          createForUser({
            io,
            userId,
            content: `Yêu cầu đặt phòng ${booking?.room_code || validation.value.room_id} ngày ${formatDateForNotification(validation.value.date)} đã được gửi và đang chờ duyệt.`,
            type: "dat_phong",
            severity: "info",
          }),
          createForRoles({
            io,
            roles: ["admin"],
            excludeUserIds: [userId],
            content: `Có yêu cầu mới đặt phòng ${booking?.room_code || validation.value.room_id} ngày ${formatDateForNotification(validation.value.date)}, từ ${validation.value.start_time.slice(0, 5)} đến ${validation.value.end_time.slice(0, 5)}.`,
            type: "dat_phong",
            severity: "info",
          }),
        ]);
      } catch (notificationError) {
        console.error("Không thể tạo thông báo đặt phòng:", notificationError);
      }

      if (io) {
        const payload = {
          id: result.bookingId,
          room_id: validation.value.room_id,
          user_id: userId,
          date: validation.value.date,
        };
        io.to(`user:${userId}`).emit("booking_created", payload);
        io.to("role:admin").emit("booking_created", payload);
        io.to("role:ky_thuat_vien").emit("booking_created", payload);
      }

      res.status(201).json({
        message: "Tạo yêu cầu đặt phòng thành công",
        id: result.bookingId,
      });
    } catch (error) {
      console.error("Lỗi tạo đặt phòng:", error);

      if (error.code === "ROOM_NOT_FOUND") {
        return res.status(400).json({ message: "Phòng học không tồn tại." });
      }

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
        const result = await withRoomAvailabilityLock(
          booking.room_id,
          async (connection) => {
            const currentBooking = await BookingModel.getById(
              id,
              connection,
              true,
            );

            if (!currentBooking) return { notFound: true };

            const availabilityError = await validateAvailability(
              currentBooking,
              id,
              connection,
            );

            if (availabilityError) return { availabilityError };

            await BookingModel.updateStatus(id, status, connection);
            return { updated: true };
          },
        );

        if (result.notFound) {
          return res
            .status(404)
            .json({ message: "Không tìm thấy yêu cầu đặt phòng." });
        }
        if (result.availabilityError) {
          return res.status(409).json({ message: result.availabilityError });
        }
      } else {
        await BookingModel.updateStatus(id, status);
      }

      const io = req.app.get("io");
      try {
        const statusLabels = {
          cho_duyet: "đang chờ duyệt",
          da_duyet: "đã được duyệt",
          tu_choi: "đã bị từ chối",
          da_huy: "đã bị hủy",
        };
        await createForUser({
          io,
          userId: booking.user_id,
          content: `Yêu cầu đặt phòng ${booking.room_code} ngày ${formatDateForNotification(booking.date)} ${statusLabels[status]}.`,
          type: "dat_phong",
          severity: status === "da_duyet" ? "info" : "warning",
        });
      } catch (notificationError) {
        console.error("Không thể tạo thông báo đặt phòng:", notificationError);
      }

      if (io) {
        const payload = { id, status, user_id: booking.user_id };
        io.to(`user:${booking.user_id}`).emit(
          "booking_status_changed",
          payload,
        );
        io.to("role:admin").emit("booking_status_changed", payload);
        io.to("role:ky_thuat_vien").emit(
          "booking_status_changed",
          payload,
        );
      }

      res.json({ message: "Cập nhật trạng thái đặt phòng thành công." });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái đặt phòng:", error);

      if (error.code === "ROOM_NOT_FOUND") {
        return res.status(400).json({ message: "Phòng học không tồn tại." });
      }

      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },

  delete: async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Mã lượt đặt phòng không hợp lệ." });
    }

    try {
      const booking = await BookingModel.getById(id);
      if (!booking) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu đặt phòng." });
      }
      const affectedRows = await BookingModel.delete(id);
      if (affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu đặt phòng." });
      }

      const io = req.app.get("io");
      try {
        await createForUser({
          io,
          userId: booking.user_id,
          content: `Yêu cầu đặt phòng ${booking.room_code} ngày ${formatDateForNotification(booking.date)} đã bị quản trị viên xóa.`,
          type: "dat_phong",
          severity: "warning",
        });
      } catch (notificationError) {
        console.error("Không thể tạo thông báo đặt phòng:", notificationError);
      }

      if (io) {
        const payload = { id, user_id: booking.user_id };
        io.to(`user:${booking.user_id}`).emit("booking_deleted", payload);
        io.to("role:admin").emit("booking_deleted", payload);
        io.to("role:ky_thuat_vien").emit("booking_deleted", payload);
      }
      res.json({ message: "Xóa đặt phòng thành công." });
    } catch (error) {
      console.error("Lỗi xóa đặt phòng:", error);
      res.status(500).json({ message: "Lỗi server", error: error.message });
    }
  },
};

module.exports = bookingController;
