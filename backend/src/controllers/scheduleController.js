const ScheduleModel = require("../models/scheduleModel");
const {
  withRoomAvailabilityLock,
} = require("../services/roomAvailabilityService");

const VALID_SESSION_TYPES = ["theory", "practical", "exam"];

const emitScheduleChange = (req, payload) => {
  const io = req.app.get("io");
  if (io) io.emit("schedule_changed", payload);
};

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

const validateSchedule = (body = {}) => {
  const roomId = Number(body.room_id);
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const instructor =
    typeof body.instructor === "string" ? body.instructor.trim() : "";
  const semester =
    typeof body.semester === "string" ? body.semester.trim() : "";

  // Mặc định lịch cũ hoặc request chưa gửi loại buổi là lý thuyết.
  const sessionType = body.session_type || "theory";

  if (!Number.isInteger(roomId) || roomId <= 0) {
    return { error: "Vui lòng chọn phòng học hợp lệ." };
  }

  if (!subject) {
    return { error: "Vui lòng nhập tên môn học." };
  }

  if (subject.length > 150 || instructor.length > 100 || semester.length > 20) {
    return { error: "Tên môn, giảng viên hoặc học kỳ vượt quá độ dài cho phép." };
  }

  if (!VALID_SESSION_TYPES.includes(sessionType)) {
    return { error: "Loại buổi học không hợp lệ." };
  }

  if (!isValidDate(body.class_date)) {
    return { error: "Vui lòng chọn ngày học hợp lệ." };
  }

  if (!isValidTime(body.start_time) || !isValidTime(body.end_time)) {
    return { error: "Vui lòng nhập giờ học hợp lệ." };
  }

  if (timeToSeconds(body.start_time) >= timeToSeconds(body.end_time)) {
    return { error: "Giờ kết thúc phải sau giờ bắt đầu." };
  }

  return {
    value: {
      room_id: roomId,
      subject,
      session_type: sessionType,
      instructor,
      class_date: body.class_date,
      start_time: body.start_time,
      end_time: body.end_time,
      semester: semester || null,
    },
  };
};

const findAvailabilityConflict = async (
  schedule,
  excludeId = null,
  executor,
) => {
  const scheduleConflict = await ScheduleModel.findConflict(
    { ...schedule, exclude_id: excludeId },
    executor,
  );

  if (scheduleConflict) {
    const resource =
      scheduleConflict.room_id === schedule.room_id
        ? `Phòng ${scheduleConflict.room_code}`
        : `Giảng viên ${scheduleConflict.instructor}`;
    return `${resource} đã có lịch trùng khung giờ với “${scheduleConflict.subject}”.`;
  }

  const bookingConflict = await ScheduleModel.findBookingConflict(
    schedule,
    executor,
  );

  if (bookingConflict) {
    const statusLabel =
      bookingConflict.status === "da_duyet" ? "đã được duyệt" : "đang chờ duyệt";
    const purpose = bookingConflict.purpose
      ? ` cho “${bookingConflict.purpose}”`
      : "";
    return `Phòng đã có yêu cầu đặt ${statusLabel}${purpose} trong khung giờ này.`;
  }

  return null;
};

const scheduleController = {
  getAll: async (req, res) => {
    try {
      const schedules = await ScheduleModel.getAll();
      return res.json(schedules);
    } catch (error) {
      console.error("Không thể tải lịch học:", error);
      return res.status(500).json({ message: "Không thể tải lịch học." });
    }
  },

  getByRoom: async (req, res) => {
    try {
      const roomId = Number(req.params.roomId);

      if (!Number.isInteger(roomId) || roomId <= 0) {
        return res.status(400).json({ message: "Mã phòng không hợp lệ." });
      }

      const schedules = await ScheduleModel.getByRoom(roomId);
      return res.json(schedules);
    } catch (error) {
      console.error("Không thể tải lịch học theo phòng:", error);
      return res.status(500).json({ message: "Không thể tải lịch học." });
    }
  },

  create: async (req, res) => {
    const validation = validateSchedule(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const result = await withRoomAvailabilityLock(
        validation.value.room_id,
        async (connection) => {
          const conflictMessage = await findAvailabilityConflict(
            validation.value,
            null,
            connection,
          );

          if (conflictMessage) return { conflictMessage };

          const id = await ScheduleModel.create(validation.value, connection);
          return { id };
        },
      );

      if (result.conflictMessage) {
        return res.status(409).json({
          message: result.conflictMessage,
        });
      }

      emitScheduleChange(req, {
        action: "created",
        scheduleId: result.id,
        roomId: validation.value.room_id,
      });

      return res.status(201).json({
        message: "Thêm lịch thành công",
        id: result.id,
      });
    } catch (error) {
      console.error("Không thể tạo lịch:", error);

      if (
        error.code === "ROOM_NOT_FOUND" ||
        error.code === "ER_NO_REFERENCED_ROW_2"
      ) {
        return res.status(400).json({ message: "Phòng học không tồn tại." });
      }

      return res.status(500).json({ message: "Không thể thêm lịch." });
    }
  },

  update: async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Mã lịch học không hợp lệ." });
    }

    const validation = validateSchedule(req.body);

    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    try {
      const existing = await ScheduleModel.getById(id);
      if (!existing) {
        return res.status(404).json({ message: "Không tìm thấy lịch học." });
      }

      const result = await withRoomAvailabilityLock(
        validation.value.room_id,
        async (connection) => {
          const conflictMessage = await findAvailabilityConflict(
            validation.value,
            id,
            connection,
          );

          if (conflictMessage) return { conflictMessage };

          const affectedRows = await ScheduleModel.update(
            id,
            validation.value,
            connection,
          );
          return { affectedRows };
        },
      );

      if (result.conflictMessage) {
        return res.status(409).json({
          message: result.conflictMessage,
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy lịch học." });
      }

      emitScheduleChange(req, {
        action: "updated",
        scheduleId: id,
        roomId: validation.value.room_id,
      });

      return res.json({ message: "Cập nhật lịch thành công." });
    } catch (error) {
      console.error("Không thể cập nhật lịch:", error);

      if (
        error.code === "ROOM_NOT_FOUND" ||
        error.code === "ER_NO_REFERENCED_ROW_2"
      ) {
        return res.status(400).json({ message: "Phòng học không tồn tại." });
      }

      return res.status(500).json({ message: "Không thể cập nhật lịch." });
    }
  },

  delete: async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Mã lịch học không hợp lệ." });
    }

    try {
      const affectedRows = await ScheduleModel.delete(id);

      if (affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy lịch học." });
      }

      emitScheduleChange(req, { action: "deleted", scheduleId: id });

      return res.json({ message: "Xóa lịch học thành công." });
    } catch (error) {
      console.error("Không thể xóa lịch học:", error);
      return res.status(500).json({ message: "Không thể xóa lịch học." });
    }
  },
};

module.exports = scheduleController;
