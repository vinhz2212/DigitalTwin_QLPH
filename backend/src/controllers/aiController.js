const { generateContent } = require("../config/gemini");
const db = require("../config/database");

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 4000;

function cleanChatHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item) =>
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim(),
    )
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter(
      (item) =>
        !item.content.includes("❌ Xin lỗi") &&
        !item.content.includes("Cần cấu hình Gemini API Key"),
    )
    .slice(-MAX_HISTORY_MESSAGES);
}

function normalizeVietnamese(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

function getVietnamCurrentDateTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
}

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function sendAIError(res, error, context, fallbackMessage) {
  const isGeminiError =
    typeof error?.code === "string" && error.code.startsWith("GEMINI_");

  console.error(`${context}:`, {
    code: error?.code || null,
    statusCode: error?.statusCode || null,
    message: error?.message || "Unknown error",
  });

  return res.status(isGeminiError ? error.statusCode || 503 : 500).json({
    message: isGeminiError ? error.publicMessage : fallbackMessage,
    ...(isGeminiError ? { code: error.code } : {}),
  });
}

const aiController = {
  chat: async (req, res) => {
    try {
      const message =
        typeof req.body.message === "string" ? req.body.message.trim() : "";

      if (!message) {
        return res.status(400).json({ message: "Vui lòng nhập câu hỏi." });
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
          message: `Câu hỏi không được vượt quá ${MAX_MESSAGE_LENGTH} ký tự.`,
        });
      }

      const history = cleanChatHistory(req.body.history);

      // mysql2 trả kết quả dạng [rows, fields].
      // Lấy dòng dữ liệu đầu tiên từ mỗi truy vấn.
      const [
        [[roomStats]],
        [[deviceStats]],
        [[incidentStats]],
        [[maintenanceStats]],
        [openMaintenanceItems],
      ] =
        await Promise.all([
          db.query(`
          SELECT
            COUNT(*) AS total,
            COALESCE(SUM(status = 'trong'), 0) AS available,
            COALESCE(SUM(status = 'dang_hoc'), 0) AS occupied,
            COALESCE(SUM(status = 'bao_tri'), 0) AS maintenance,
            COALESCE(SUM(status = 'su_co'), 0) AS incident
          FROM Rooms
        `),
          db.query(`
          SELECT
            COUNT(*) AS total,
            COALESCE(SUM(status = 'hoat_dong'), 0) AS active,
            COALESCE(SUM(status = 'tat'), 0) AS off,
            COALESCE(SUM(status = 'hong'), 0) AS broken,
            COALESCE(SUM(status = 'dang_sua'), 0) AS repairing
          FROM Devices
        `),
          db.query(`
          SELECT COUNT(*) AS active
          FROM Incidents
          WHERE status = 'dang_xay_ra'
        `),
          db.query(`
          SELECT
            COUNT(*) AS open_total,
            COALESCE(SUM(status = 'cho_xu_ly'), 0) AS pending,
            COALESCE(SUM(status = 'dang_sua'), 0) AS in_progress
          FROM Maintenance
          WHERE status IN ('cho_xu_ly', 'dang_sua')
        `),
          db.query(`
          SELECT
            m.status,
            m.description,
            d.name AS device_name,
            dt.name AS device_type,
            r.code AS room_code
          FROM Maintenance m
          JOIN Devices d ON m.device_id = d.id
          JOIN DeviceTypes dt ON d.device_type_id = dt.id
          JOIN Rooms r ON d.room_id = r.id
          WHERE m.status IN ('cho_xu_ly', 'dang_sua')
          ORDER BY m.created_at ASC
          LIMIT 20
        `),
        ]);

      const maintenanceDetails = openMaintenanceItems.length
        ? openMaintenanceItems
            .map((item) => {
              const status =
                item.status === "dang_sua" ? "đang sửa" : "chờ xử lý";
              return `phòng ${item.room_code}: ${item.device_name} (${item.device_type}), ${status}${item.description ? ` — ${item.description}` : ""}`;
            })
            .join("; ")
        : "không có phiếu bảo trì đang mở";

      const systemContext = `
Số liệu hiện tại của hệ thống Smart Campus:
- Phòng học: ${roomStats?.total || 0} tổng, ${roomStats?.available || 0} trống, ${roomStats?.occupied || 0} đang học, ${roomStats?.maintenance || 0} bảo trì, ${roomStats?.incident || 0} có sự cố.
- Thiết bị: ${deviceStats?.total || 0} tổng, ${deviceStats?.active || 0} đang hoạt động, ${deviceStats?.off || 0} đã tắt, ${deviceStats?.broken || 0} bị hỏng, ${deviceStats?.repairing || 0} đang sửa.
- Sự cố đang xảy ra: ${incidentStats?.active || 0}.
- Phiếu bảo trì đang mở: ${maintenanceStats?.open_total || 0} (${maintenanceStats?.pending || 0} chờ xử lý, ${maintenanceStats?.in_progress || 0} đang sửa). Chi tiết hiện có: ${maintenanceDetails}.
- Bảng dữ liệu chỉ lưu phiếu bảo trì và ngày bảo trì gần nhất, không lưu lịch bảo trì đã lên kế hoạch. Không được tự kết luận rằng thiết bị đang tắt cần bảo trì; cần kiểm tra thực tế trước.
`;

      const normalizedQuestion = normalizeVietnamese(message);

      // Các câu hỏi có mã phòng phải tra đúng phòng và lịch hiện tại trong MySQL,
      // không suy luận từ số liệu tổng quan rồi giao cho Gemini đoán.
      const roomCode = message.match(/\b([A-Za-z]\d{3})\b/)?.[1]?.toUpperCase();
      const asksRoomStatus =
        Boolean(roomCode) &&
        /(phong|dang hoc|co lop|co buoi hoc|lich hoc|trong khong|dang su dung)/.test(
          normalizedQuestion,
        );

      if (asksRoomStatus) {
        const { date, time } = getVietnamCurrentDateTime();
        const [rooms] = await db.query(
          `
            SELECT
              r.id,
              r.code,
              r.name,
              r.status,
              r.capacity,
              b.code AS building_code,
              f.floor_number
            FROM Rooms r
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE UPPER(r.code) = ?
            LIMIT 1
          `,
          [roomCode],
        );

        let responseText;
        if (!rooms.length) {
          responseText = `Không tìm thấy phòng ${roomCode} trong dữ liệu hệ thống.`;
        } else {
          const room = rooms[0];
          const [currentSchedules] = await db.query(
            `
              SELECT subject, session_type, instructor, start_time, end_time
              FROM Schedules
              WHERE room_id = ?
                AND class_date = ?
                AND start_time <= ?
                AND end_time > ?
              ORDER BY start_time
            `,
            [room.id, date, time, time],
          );

          const location = `${room.building_code}, tầng ${room.floor_number}`;
          const currentStatus = {
            trong: "đang được ghi nhận là trống",
            dang_hoc: "đang được ghi nhận là đang học/sử dụng",
            bao_tri: "đang được ghi nhận là bảo trì",
            su_co: "đang được ghi nhận có sự cố",
          }[room.status] || `có trạng thái “${room.status}”`;

          if (currentSchedules.length) {
            const scheduleDetails = currentSchedules
              .map((schedule) => {
                const sessionType = {
                  theory: "lý thuyết",
                  practical: "thực hành",
                  exam: "thi",
                }[schedule.session_type] || schedule.session_type;
                const instructor = schedule.instructor
                  ? `, giảng viên ${schedule.instructor}`
                  : "";
                return `${schedule.subject} (${sessionType}), ${formatTime(schedule.start_time)}–${formatTime(schedule.end_time)}${instructor}`;
              })
              .join("; ");

            responseText =
              `Theo thời khóa biểu hôm nay (${date}), phòng ${room.code} hiện có buổi học: ${scheduleDetails}. ` +
              `Trạng thái phòng trong hệ thống: ${currentStatus} (${location}).`;
          } else {
            responseText =
              `Hiện không có buổi học nào được xếp trong phòng ${room.code} vào lúc ${time} ngày ${date}. ` +
              `Trạng thái phòng trong hệ thống: ${currentStatus} (${location}).`;
          }
        }

        await db.query(
          `
            INSERT INTO AIAnalysis (user_id, prompt, response, type)
            VALUES (?, ?, ?, 'chatbot')
          `,
          [req.user.id, message, responseText],
        );

        return res.json({ response: responseText });
      }

      const asksRoomCount =
        normalizedQuestion.includes("phong") &&
        /(bao nhieu|co may|may phong|so luong|tong so)/.test(
          normalizedQuestion,
        );

      if (asksRoomCount) {
        const total = Number(roomStats?.total) || 0;
        const available = Number(roomStats?.available) || 0;
        const occupied = Number(roomStats?.occupied) || 0;
        const maintenance = Number(roomStats?.maintenance) || 0;
        const incident = Number(roomStats?.incident) || 0;

        let count = total;
        let label = "phòng";

        if (normalizedQuestion.includes("trong")) {
          count = available;
          label = "phòng đang trống";
        } else if (normalizedQuestion.includes("dang hoc")) {
          count = occupied;
          label = "phòng đang học";
        } else if (normalizedQuestion.includes("bao tri")) {
          count = maintenance;
          label = "phòng đang bảo trì";
        } else if (normalizedQuestion.includes("su co")) {
          count = incident;
          label = "phòng đang có sự cố";
        }

        const responseText =
          `Hiện có ${count} ${label}. ` +
          `Tổng số ${total} phòng gồm ${available} phòng trống, ` +
          `${occupied} phòng đang học, ${maintenance} phòng bảo trì ` +
          `và ${incident} phòng có sự cố.`;

        await db.query(
          `
            INSERT INTO AIAnalysis (user_id, prompt, response, type)
            VALUES (?, ?, ?, 'chatbot')
          `,
          [req.user.id, message, responseText],
        );

        return res.json({ response: responseText });
      }

      const asksBrokenDevices =
        normalizedQuestion.includes("thiet bi") &&
        /(hong|loi|hu hong)/.test(normalizedQuestion);

      if (asksBrokenDevices) {
        const [brokenDevices] = await db.query(`
          SELECT d.name, r.code AS room_code
          FROM Devices d
          LEFT JOIN Rooms r ON d.room_id = r.id
          WHERE d.status = 'hong'
          ORDER BY r.code, d.name
        `);

        const total = Number(deviceStats?.total) || 0;
        const active = Number(deviceStats?.active) || 0;
        const off = Number(deviceStats?.off) || 0;
        const repairing = Number(deviceStats?.repairing) || 0;

        const brokenList = brokenDevices.length
          ? brokenDevices
              .map(
                (device) =>
                  `- ${device.name} — phòng ${device.room_code || "chưa rõ"}`,
              )
              .join("\n")
          : "Hiện không có thiết bị nào được ghi nhận ở trạng thái hỏng.";

        const responseText =
          `${brokenList}\n\n` +
          `Thống kê: ${brokenDevices.length}/${total} thiết bị hỏng, ` +
          `${active} đang hoạt động, ${off} đã tắt và ${repairing} đang sửa.`;

        await db.query(
          `
            INSERT INTO AIAnalysis (user_id, prompt, response, type)
            VALUES (?, ?, ?, 'chatbot')
          `,
          [req.user.id, message, responseText],
        );

        return res.json({ response: responseText });
      }

      const response = await generateContent(message, {
        history,
        context: `${systemContext}

Quy tắc trả lời hội thoại:
- Trả lời trực tiếp câu hỏi mới nhất; dùng các lượt trước để hiểu từ ngữ như "nó", "kế hoạch đó", "triển khai thế nào". Không lặp lại toàn bộ số liệu cũ nếu người dùng chỉ hỏi tiếp một ý.
- Trình bày câu trả lời thành các câu hoàn chỉnh, theo thứ tự hợp lý. Nếu có nhiều bước, liệt kê đầy đủ từng bước và kết luận ngắn; không dừng giữa câu hoặc giữa danh sách.
- Chỉ dùng số liệu hệ thống ở trên; không nói hệ thống đang chờ đồng bộ nếu không có dữ liệu xác nhận. Thiết bị đã tắt không đồng nghĩa với thiết bị hỏng hay cần bảo trì. Nếu thiếu dữ liệu, nêu rõ giới hạn.
- Với lịch/kế hoạch bảo trì, tách dữ liệu thực tế khỏi đề xuất. Không tự bịa ngày, thứ, giờ, thời lượng hay số lượng thiết bị mỗi ngày. Nêu rõ phiếu đang mở theo dữ liệu trên; mọi kế hoạch là đề xuất chưa được đặt lịch/phê duyệt.
- Trả lời ngắn gọn, chuyên nghiệp bằng tiếng Việt; với yêu cầu giải thích hoặc kế hoạch, cung cấp đủ các ý để người dùng có thể thực hiện.`,
      });

      await db.query(
        `
          INSERT INTO AIAnalysis (user_id, prompt, response, type)
          VALUES (?, ?, ?, 'chatbot')
        `,
        [req.user.id, message, response],
      );

      return res.json({ response });
    } catch (error) {
      return sendAIError(
        res,
        error,
        "Gemini chat error",
        "Không thể xử lý câu hỏi AI lúc này.",
      );
    }
  },

  analyzeIncident: async (req, res) => {
    try {
      const { incident_type, description, room_code } = req.body;

      const prompt = `
Phân tích sự cố tại phòng ${room_code}:
- Loại sự cố: ${incident_type}
- Mô tả: ${description}

Hãy đưa ra:
1. Nguyên nhân có thể
2. Mức độ nguy hiểm
3. Các bước xử lý ngay lập tức
4. Biện pháp phòng ngừa
`;

      const response = await generateContent(prompt);

      await db.query(
        `
          INSERT INTO AIAnalysis (user_id, prompt, response, type)
          VALUES (?, ?, ?, 'phan_tich_su_co')
        `,
        [req.user.id, prompt, response],
      );

      return res.json({ response });
    } catch (error) {
      return sendAIError(
        res,
        error,
        "Gemini incident analysis error",
        "Không thể phân tích sự cố lúc này.",
      );
    }
  },

  suggestMaintenance: async (req, res) => {
    try {
      const { device_name, device_type, last_maintenance, issue } = req.body;

      const prompt = `
Đề xuất bảo trì cho thiết bị:
- Tên thiết bị: ${device_name}
- Loại: ${device_type}
- Lần bảo trì gần nhất: ${last_maintenance || "Chưa có"}
- Vấn đề hiện tại: ${issue}

Hãy đưa ra:
1. Đánh giá tình trạng thiết bị
2. Các bước bảo trì cần thực hiện
3. Thời gian bảo trì dự kiến
4. Lịch bảo trì định kỳ đề xuất
`;

      const response = await generateContent(prompt);

      await db.query(
        `
          INSERT INTO AIAnalysis (user_id, prompt, response, type)
          VALUES (?, ?, ?, 'de_xuat_bao_tri')
        `,
        [req.user.id, prompt, response],
      );

      return res.json({ response });
    } catch (error) {
      return sendAIError(
        res,
        error,
        "Gemini maintenance suggestion error",
        "Không thể tạo đề xuất bảo trì lúc này.",
      );
    }
  },

  findRoom: async (req, res) => {
    try {
      const { capacity, type } = req.body;
      const roomCapacity = Number(capacity);

      if (!Number.isFinite(roomCapacity) || roomCapacity < 1) {
        return res.status(400).json({
          message: "Sức chứa cần tìm không hợp lệ.",
        });
      }

      const queryParams = [roomCapacity];
      const typeCondition = type ? "AND r.type = ?" : "";

      if (type) {
        queryParams.push(type);
      }

      const [availableRooms] = await db.query(
        `
          SELECT
            r.id,
            r.code,
            r.name,
            r.capacity,
            r.type,
            f.floor_number,
            b.code AS building_code
          FROM Rooms r
          JOIN Floors f ON r.floor_id = f.id
          JOIN Buildings b ON f.building_id = b.id
          WHERE r.status = 'trong'
            AND r.capacity >= ?
            ${typeCondition}
          ORDER BY r.capacity ASC, b.code ASC, f.floor_number ASC
          LIMIT 5
        `,
        queryParams,
      );

      const responseText = availableRooms.length
        ? `Tìm thấy ${availableRooms.length} phòng đang có trạng thái trống và đủ sức chứa từ ${roomCapacity} người trở lên:\n` +
          availableRooms
            .map(
              (room) =>
                `- ${room.code}: ${room.capacity} chỗ, tòa ${room.building_code}, tầng ${room.floor_number}`,
            )
            .join("\n")
        : `Không tìm thấy phòng đang có trạng thái trống và đủ sức chứa từ ${roomCapacity} người trở lên.`;

      return res.json({
        response: responseText,
        rooms: availableRooms,
      });
    } catch (error) {
      console.error("Gemini room search error:", error);
      return res.status(500).json({
        message: "Không thể tìm phòng lúc này.",
        error: error.message,
      });
    }
  },
};

module.exports = aiController;
