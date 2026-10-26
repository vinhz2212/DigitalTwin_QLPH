const { generateContent } = require("../config/gemini");
const db = require("../config/database");
const RoomModel = require("../models/roomModel");
const {
  syncRoomOperationalStatus,
  restoreRoomPowerAfterResolvedIncident,
} = require("../services/roomOperationalStatusService");
const {
  getAutomaticIncidentAlerts,
} = require("../services/automaticIncidentAlertService");

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
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function parsePowerCommand(message) {
  const normalized = normalizeVietnamese(message).trim().replace(/\s+/g, " ");
  if (normalized.includes("?")) return null;

  const instruction = normalized.replace(
    /^(?:(?:ai|tro ly)\s+)?(?:(?:hay|vui long)\s+)?/,
    "",
  );
  const commandPatterns = [
    { action: "cut", pattern: /^(?:ngat|cat) (?:nguon )?dien\b/ },
    {
      action: "restore",
      pattern: /^(?:khoi phuc|bat|cap|mo)(?: lai)? (?:nguon )?dien(?: lai)?\b/,
    },
  ];
  const command = commandPatterns
    .map(({ action, pattern }) => ({ action, match: instruction.match(pattern) }))
    .find(({ match }) => match);
  if (!command) return null;

  const target = instruction.slice(command.match[0].length).trim();
  const roomMatch = target.match(
    /^(?:(?:cho |tai |cua )?phong(?: hoc)? )?([a-z]\d{3})(?: (?:di|nhe|giup toi))?[.!]*$/,
  );

  return {
    action: command.action,
    roomCodes: roomMatch ? [roomMatch[1].toUpperCase()] : [],
  };
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

function shiftISODate(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getRequestedDate(question) {
  const explicitISODate = question.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const explicitLocalDate = question.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  let year;
  let month;
  let day;

  if (explicitISODate) {
    [, year, month, day] = explicitISODate;
  } else if (explicitLocalDate) {
    [, day, month, year] = explicitLocalDate;
  } else {
    const today = getVietnamCurrentDateTime().date;
    if (/(hom nay|ngay nay|hien tai|dang dien ra)/.test(question)) return today;
    if (/(ngay mai|hom sau|mai)/.test(question)) return shiftISODate(today, 1);
    return null;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function getBuildingScope(question) {
  const mentionsA = /toa(?: nha)?\s*a\b/.test(question);
  const mentionsB = /toa(?: nha)?\s*b\b/.test(question);
  const mentionsBoth =
    (mentionsA && mentionsB) ||
    /(ca hai toa|hai toa|toa(?: nha)?\s*a va b\b|toa(?: nha)?\s*b va a\b)/.test(
      question,
    );

  if (mentionsBoth) {
    return { codes: [], label: "ở cả Tòa A và Tòa B" };
  }
  if (mentionsA) return { codes: ["A"], label: "ở Tòa A" };
  if (mentionsB) return { codes: ["B"], label: "ở Tòa B" };
  return { codes: [], label: "toàn khuôn viên" };
}

function getRequestedRoomType(question) {
  const roomTypes = [
    {
      value: "thuc_hanh",
      label: "thực hành",
      pattern: /(thuc hanh|phong may|phong lab|phong thi nghiem)/,
    },
    { value: "ly_thuyet", label: "lý thuyết", pattern: /ly thuyet/ },
    { value: "hoi_truong", label: "hội trường", pattern: /hoi truong/ },
  ];

  return roomTypes.find((roomType) => roomType.pattern.test(question)) || null;
}

async function saveChatAnswer(userId, prompt, response) {
  await db.query(
    `
      INSERT INTO AIAnalysis (user_id, prompt, response, type)
      VALUES (?, ?, ?, 'chatbot')
    `,
    [userId, prompt, response],
  );
  return response;
}

async function handlePowerCommand(req, message, command) {
  if (!["admin", "ky_thuat_vien"].includes(req.user.role)) {
    return {
      status: 403,
      response: "Chỉ quản trị viên hoặc kỹ thuật viên được thay đổi trạng thái nguồn điện trên hệ thống.",
    };
  }

  if (command.roomCodes.length !== 1) {
    return {
      status: 400,
      response: "Vui lòng chỉ rõ một mã phòng, ví dụ: ngắt điện phòng A101.",
    };
  }

  const roomCode = command.roomCodes[0];
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [rooms] = await connection.query(
      "SELECT id, code, power_status FROM Rooms WHERE UPPER(code) = ? LIMIT 1 FOR UPDATE",
      [roomCode],
    );
    const room = rooms[0];
    if (!room) {
      await connection.rollback();
      return { status: 404, response: `Không tìm thấy phòng ${roomCode}.` };
    }

    const powerIsOff = room.power_status === "ngat_dien";
    if (command.action === "cut" && powerIsOff) {
      await connection.rollback();
      return {
        status: 200,
        response: `Nguồn điện phòng ${room.code} đã ở trạng thái ngắt trên hệ thống.`,
      };
    }
    if (command.action === "restore" && !powerIsOff) {
      await connection.rollback();
      return {
        status: 200,
        response: `Nguồn điện phòng ${room.code} đang ở trạng thái có điện trên hệ thống.`,
      };
    }

    if (command.action === "cut") {
      const [[fireStats]] = await connection.query(
        `SELECT COUNT(*) AS total FROM Incidents
         WHERE room_id = ? AND type = 'chay' AND simulated = 1
           AND status <> 'da_giai_quyet'`,
        [room.id],
      );
      if (!Number(fireStats.total)) {
        await connection.rollback();
        return {
          status: 409,
          response: `Phòng ${room.code} chưa có sự cố cháy đang mở trên hệ thống. Không thay đổi trạng thái nguồn điện.`,
        };
      }
    } else {
      const [[incidentStats]] = await connection.query(
        `SELECT COUNT(*) AS total FROM Incidents
         WHERE room_id = ? AND type IN ('chay', 'mat_dien')
           AND status <> 'da_giai_quyet'`,
        [room.id],
      );
      if (Number(incidentStats.total) > 0) {
        await connection.rollback();
        return {
          status: 409,
          response: `Phòng ${room.code} vẫn còn sự cố cháy hoặc mất điện. Hãy vào Mô phỏng sự cố và bấm “Giải quyết” cho phòng này; sau khi xác nhận an toàn, gửi lại lệnh bật điện.`,
        };
      }
    }

    const nextPowerStatus = command.action === "cut" ? "ngat_dien" : "co_dien";
    if (command.action === "cut") {
      await connection.query("UPDATE Rooms SET power_status = ? WHERE id = ?", [
        nextPowerStatus,
        room.id,
      ]);
      await connection.query(
        `UPDATE Devices
         SET power_cut_previous_status = COALESCE(power_cut_previous_status, status),
             status = 'tat'
         WHERE room_id = ?`,
        [room.id],
      );
    } else {
      await restoreRoomPowerAfterResolvedIncident(room.id, connection);
    }
    await syncRoomOperationalStatus(room.id, connection);

    const response =
      command.action === "cut"
        ? `Đã chuyển nguồn điện phòng ${room.code} sang trạng thái ngắt trên hệ thống. Phòng vẫn được đánh dấu có sự cố cháy; các thiết bị đang hoạt động đã chuyển sang tắt.`
        : `Đã khôi phục trạng thái nguồn điện trên hệ thống cho phòng ${room.code}. Thiết bị trở về trạng thái trước khi ngắt điện; thiết bị vốn hỏng hoặc đang sửa không bị bật nhầm.`;
    await connection.query(
      `INSERT INTO ActivityLogs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, 'Room', ?, ?, ?)`,
      [
        req.user.id,
        command.action === "cut" ? "SIMULATED_POWER_CUT" : "SIMULATED_POWER_RESTORE",
        room.id,
        JSON.stringify({ room_code: room.code, power_status: nextPowerStatus }),
        req.ip || null,
      ],
    );
    await connection.query(
      "INSERT INTO AIAnalysis (user_id, prompt, response, type) VALUES (?, ?, ?, 'chatbot')",
      [req.user.id, message, response],
    );
    await connection.commit();

    return { status: 200, response, changed: true, roomId: room.id, logged: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getDeviceStats() {
  const [[stats]] = await db.query(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 'hoat_dong'), 0) AS active,
      COALESCE(SUM(status = 'tat'), 0) AS off,
      COALESCE(SUM(status = 'hong'), 0) AS broken,
      COALESCE(SUM(status = 'dang_sua'), 0) AS repairing
    FROM Devices
  `);
  return stats;
}

async function getMaintenancePlanAnswer() {
  const [
    [[openStats]],
    [[brokenStats]],
    [openTickets],
    [brokenWithoutTicket],
  ] = await Promise.all([
    db.query(`
      SELECT COUNT(*) AS total
      FROM Maintenance
      WHERE status IN ('cho_xu_ly', 'dang_sua')
    `),
    db.query("SELECT COUNT(*) AS total FROM Devices WHERE status = 'hong'"),
    db.query(`
      SELECT m.status, d.name AS device_name, r.code AS room_code
      FROM Maintenance m
      JOIN Devices d ON m.device_id = d.id
      JOIN Rooms r ON d.room_id = r.id
      WHERE m.status IN ('cho_xu_ly', 'dang_sua')
      ORDER BY m.created_at ASC
      LIMIT 5
    `),
    db.query(`
      SELECT d.name AS device_name, r.code AS room_code
      FROM Devices d
      JOIN Rooms r ON d.room_id = r.id
      WHERE d.status = 'hong'
        AND NOT EXISTS (
          SELECT 1 FROM Maintenance m
          WHERE m.device_id = d.id
            AND m.status IN ('cho_xu_ly', 'dang_sua')
        )
      ORDER BY r.code, d.name
      LIMIT 5
    `),
  ]);

  const openCount = Number(openStats?.total) || 0;
  const brokenCount = Number(brokenStats?.total) || 0;
  const ticketDetails = openTickets.length
    ? `\nPhiếu cần xử lý trước: ${openTickets
        .map((item) =>
          `${item.device_name} ở phòng ${item.room_code} (${item.status === "dang_sua" ? "đang sửa" : "chờ xử lý"})`,
        )
        .join("; ")}${openCount > openTickets.length ? `; còn ${openCount - openTickets.length} phiếu khác` : ""}.`
    : "";
  const unreportedDetails = brokenWithoutTicket.length
    ? `\nThiết bị hỏng chưa có phiếu đang mở cần kiểm tra: ${brokenWithoutTicket
        .map((item) => `${item.device_name} ở phòng ${item.room_code}`)
        .join("; ")}.`
    : "";

  return `Đề xuất bảo trì dựa trên dữ liệu hiện tại: ${openCount} phiếu bảo trì đang mở, ${brokenCount} thiết bị ghi nhận hỏng.${ticketDetails}${unreportedDetails}

Các bước triển khai:
1. Rà soát phiếu đang mở và kiểm tra thực tế các thiết bị ghi nhận hỏng. Thiết bị đang tắt không được xem là hỏng.
2. Ưu tiên xử lý thiết bị hỏng và phiếu chờ xử lý; xác nhận vật tư, người phụ trách và thời lượng thực tế.
3. Đối chiếu lịch học và thời gian phòng trống trước khi chọn ngày, giờ bảo trì.
4. Trình người quản lý phê duyệt, sau đó tạo hoặc cập nhật phiếu và phân công kỹ thuật viên.

Hệ thống chưa lưu lịch bảo trì đã lên kế hoạch. Đây là quy trình đề xuất, chưa phải lịch đã đặt hoặc được phê duyệt.`;
}

async function getChatSystemContext() {
  const [
    roomStats,
    deviceStats,
    [[incidentStats]],
    [[maintenanceStats]],
    [openMaintenanceItems],
  ] = await Promise.all([
    RoomModel.getStats(),
    getDeviceStats(),
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

  return `
Số liệu hiện tại của hệ thống Smart Campus:
- Phòng học: ${roomStats?.total || 0} tổng, ${roomStats?.trong || 0} trống, ${roomStats?.dang_hoc || 0} đang học, ${roomStats?.bao_tri || 0} bảo trì, ${roomStats?.su_co || 0} có sự cố.
- Thiết bị: ${deviceStats?.total || 0} tổng, ${deviceStats?.active || 0} đang hoạt động, ${deviceStats?.off || 0} đã tắt, ${deviceStats?.broken || 0} bị hỏng, ${deviceStats?.repairing || 0} đang sửa.
- Sự cố đang xảy ra: ${incidentStats?.active || 0}.
- Phiếu bảo trì đang mở: ${maintenanceStats?.open_total || 0} (${maintenanceStats?.pending || 0} chờ xử lý, ${maintenanceStats?.in_progress || 0} đang sửa). Chi tiết hiện có: ${maintenanceDetails}.
- Bảng dữ liệu chỉ lưu phiếu bảo trì và ngày bảo trì gần nhất, không lưu lịch bảo trì đã lên kế hoạch. Không được tự kết luận rằng thiết bị đang tắt cần bảo trì; cần kiểm tra thực tế trước.
- Các thống kê tổng hợp không chứa danh sách chi tiết phòng, thiết bị, lịch học hay sự cố. Chỉ nêu mã phòng, tên thiết bị, lịch hoặc số lượng chi tiết khi đã được truy vấn và có trong dữ liệu đầu vào; nếu chưa có thì nói rõ hoặc hỏi người dùng bổ sung ngày/mã phòng.
`;
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
  incidentAlerts: async (req, res) => {
    try {
      const alerts = await getAutomaticIncidentAlerts(req.user.id, req.user.iat);
      return res.json(alerts);
    } catch (error) {
      console.error("Lỗi lấy cảnh báo tự động:", error);
      return res.status(500).json({ message: "Không thể tải cảnh báo AI." });
    }
  },

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

      const powerCommand = parsePowerCommand(message);
      if (powerCommand) {
        const result = await handlePowerCommand(req, message, powerCommand);
        if (!result.logged) {
          await saveChatAnswer(req.user.id, message, result.response);
        }
        if (result.changed) {
          const io = req.app.get("io");
          io?.emit("rooms_changed", {
            action: "power_status_changed",
            roomId: result.roomId,
          });
          io?.emit("devices_changed", { roomId: result.roomId });
        }
        if (result.status !== 200) {
          return res.status(result.status).json({ message: result.response });
        }
        return res.json({ response: result.response });
      }

      const normalizedQuestion = normalizeVietnamese(message);
      const roomCode = message.match(/\b([A-Za-z]\d{3})\b/)?.[1]?.toUpperCase();
      const requestedRoomType = getRequestedRoomType(normalizedQuestion);

      const asksRoomPowerStatus =
        Boolean(roomCode) &&
        /\b(?:nguon dien|ngat dien|cat dien|khoi phuc dien)\b/.test(normalizedQuestion) &&
        /\b(?:trang thai|co|con|da|dang|bi|the nao|mat|ngat)\b/.test(
          normalizedQuestion,
        );
      if (asksRoomPowerStatus) {
        const [rooms] = await db.query(
          "SELECT code, power_status FROM Rooms WHERE UPPER(code) = ? LIMIT 1",
          [roomCode],
        );
        const responseText = rooms.length
          ? `Theo dữ liệu hệ thống, nguồn điện phòng ${rooms[0].code} ${rooms[0].power_status === "ngat_dien" ? "đã ngắt" : "đang có điện"}. Trạng thái này không xác nhận nguồn điện thực tế.`
          : `Không tìm thấy phòng ${roomCode} trong hệ thống.`;
        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const asksGeneralMaintenancePlan =
        !roomCode &&
        /^(?:de xuat|goi y|lap|len) (?:lich |ke hoach )?(?:bao tri|bao duong)(?: thiet bi)?[?.!]*$/.test(
          normalizedQuestion.trim(),
        );
      if (asksGeneralMaintenancePlan) {
        const responseText = await getMaintenancePlanAnswer();
        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      // Câu hỏi đếm phòng theo sức chứa phải được xử lý trước câu hỏi đếm phòng
      // chung để không trả nhầm tổng số phòng toàn trường.
      const requestedCapacity = normalizedQuestion.match(
        /(?:suc chua|chua|cho ngoi|phong cho)[^0-9]{0,20}(\d{1,4})\s*(?:nguoi|cho)?/,
      )?.[1];
      const asksRoomCapacity =
        normalizedQuestion.includes("phong") &&
        Boolean(requestedCapacity) &&
        /(bao nhieu|co may|tong cong|tong so|so luong|may phong|liet ke|tim|nao)/.test(
          normalizedQuestion,
        );

      if (asksRoomCapacity) {
        const capacity = Number(requestedCapacity);
        const buildingScope = getBuildingScope(normalizedQuestion);
        const onlyAvailable = /(phong trong|con trong|dang trong)/.test(
          normalizedQuestion,
        );
        const conditions = ["r.capacity >= ?"];
        const params = [capacity];

        if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        if (onlyAvailable) {
          conditions.push("r.status = 'trong' AND r.power_status = 'co_dien'");
        }
        if (requestedRoomType) {
          conditions.push("r.type = ?");
          params.push(requestedRoomType.value);
        }

        const [matchingRooms] = await db.query(
          `
            SELECT r.code, r.capacity, r.type, r.status,
                   b.code AS building_code
            FROM Rooms r
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE ${conditions.join(" AND ")}
            ORDER BY b.code, r.capacity, r.code
          `,
          params,
        );

        const roomLabel = `phòng${
          requestedRoomType ? ` ${requestedRoomType.label}` : ""
        }${onlyAvailable ? " đang trống" : ""}`;
        const roomList = matchingRooms.length
          ? ` Danh sách: ${matchingRooms
              .map(
                (room) =>
                  `${room.code} (Tòa ${room.building_code}, ${room.capacity} chỗ)`,
              )
              .join(", ")}.`
          : "";
        const responseText =
          matchingRooms.length
            ? `Có ${matchingRooms.length} ${roomLabel} ${buildingScope.label} có sức chứa từ ${capacity} người trở lên.${roomList}`
            : `Không có ${roomLabel} ${buildingScope.label} nào có sức chứa từ ${capacity} người trở lên theo dữ liệu hiện tại.`;

        await saveChatAnswer(req.user.id, message, responseText);

        return res.json({ response: responseText });
      }

      const asksRoomCapacityWithoutThreshold =
        !roomCode &&
        normalizedQuestion.includes("phong") &&
        /(suc chua|cho ngoi|chua duoc|phong chua)/.test(normalizedQuestion) &&
        /(bao nhieu|nao|toi da|cao nhat|lon nhat)/.test(normalizedQuestion);

      if (asksRoomCapacityWithoutThreshold) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const isMaximumQuestion = /(toi da|cao nhat|lon nhat)/.test(
          normalizedQuestion,
        );
        const buildingCondition = buildingScope.codes.length
          ? `AND UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`
          : "";
        const [allRooms] = await db.query(
          `
            SELECT r.code, r.capacity, b.code AS building_code
            FROM Rooms r
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE 1 = 1 ${buildingCondition}
            ORDER BY r.capacity DESC, b.code, r.code
          `,
          buildingScope.codes,
        );
        const maxCapacity = allRooms[0]?.capacity;
        const matchingRooms = isMaximumQuestion && maxCapacity
          ? allRooms.filter((room) => room.capacity === maxCapacity)
          : allRooms;
        const details = matchingRooms
          .map(
            (room) =>
              `${room.code}: ${room.capacity} chỗ (Tòa ${room.building_code})`,
          )
          .join("; ");
        const responseText = matchingRooms.length
          ? isMaximumQuestion
            ? `Sức chứa lớn nhất ${buildingScope.label} là ${maxCapacity} người. Phòng đạt mức này: ${details}.`
            : `Dữ liệu sức chứa của ${matchingRooms.length} phòng ${buildingScope.label}: ${details}.`
          : `Chưa có dữ liệu phòng để xác định sức chứa ${buildingScope.label}.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      // Các câu hỏi có mã phòng phải tra đúng phòng và lịch hiện tại trong MySQL,
      // không suy luận từ số liệu tổng quan rồi giao cho Gemini đoán.
      const asksRoomCapacityByCode =
        Boolean(roomCode) && /(suc chua|cho ngoi|chua duoc bao nhieu)/.test(normalizedQuestion);
      const asksRoomScheduleByCode =
        Boolean(roomCode) &&
        /lich/.test(normalizedQuestion) &&
        !/(dang hoc|luc nay|hien tai)/.test(normalizedQuestion);
      const asksRoomStatus =
        Boolean(roomCode) &&
        /(phong|dang hoc|co lop|co buoi hoc|lich|trong khong|dang su dung|suc chua|cho ngoi)/.test(
          normalizedQuestion,
        ) &&
        !/(thiet bi|su co|phieu bao tri|bao tri thiet bi)/.test(
          normalizedQuestion,
        );

      if (asksRoomStatus) {
        const { date: today, time } = getVietnamCurrentDateTime();
        const date = asksRoomScheduleByCode
          ? getRequestedDate(normalizedQuestion) || today
          : today;
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
          const scheduleTimeFilter = asksRoomScheduleByCode
            ? ""
            : "AND start_time <= ? AND end_time > ?";
          const scheduleParams = asksRoomScheduleByCode
            ? [room.id, date]
            : [room.id, date, time, time];
          const [roomSchedules] = await db.query(
            `
              SELECT subject, session_type, instructor, start_time, end_time
              FROM Schedules
              WHERE room_id = ?
                AND class_date = ?
                ${scheduleTimeFilter}
              ORDER BY start_time
            `,
            scheduleParams,
          );

          const location = `${room.building_code}, tầng ${room.floor_number}`;
          const currentStatus = {
            trong: "đang được ghi nhận là trống",
            dang_hoc: "đang được ghi nhận là đang học/sử dụng",
            bao_tri: "đang được ghi nhận là bảo trì",
            su_co: "đang được ghi nhận có sự cố",
          }[room.status] || `có trạng thái “${room.status}”`;

          if (asksRoomCapacityByCode) {
            responseText =
              `Phòng ${room.code} có sức chứa ${room.capacity} người (${location}). ` +
              `Trạng thái hiện được ghi nhận là ${currentStatus}.`;
          } else if (roomSchedules.length) {
            const scheduleDetails = roomSchedules
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

            responseText = asksRoomScheduleByCode
              ? `Lịch học hôm nay (${date}) của phòng ${room.code}: ${scheduleDetails}. (${location})`
              : `Theo thời khóa biểu hôm nay (${date}), phòng ${room.code} hiện có buổi học: ${scheduleDetails}. Trạng thái phòng trong hệ thống: ${currentStatus} (${location}).`;
          } else {
            responseText = asksRoomScheduleByCode
              ? `Hôm nay (${date}) chưa có buổi học nào được xếp trong phòng ${room.code} (${location}).`
              : `Hiện không có buổi học nào được xếp trong phòng ${room.code} vào lúc ${time} ngày ${date}. Trạng thái phòng trong hệ thống: ${currentStatus} (${location}).`;
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

      const asksRoomList =
        !roomCode &&
        normalizedQuestion.includes("phong") &&
        (Boolean(requestedRoomType) ||
          /(tim|nao|danh sach|liet ke|trong khong|con trong)/.test(
            normalizedQuestion,
          )) &&
        !/(thiet bi|phieu)/.test(normalizedQuestion);

      if (asksRoomList) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const conditions = [];
        const params = [];
        const roomStatus = [
          { value: "trong", pattern: /(phong trong|con trong|dang trong)/ },
          { value: "dang_hoc", pattern: /(dang hoc|co lop|dang su dung)/ },
          { value: "bao_tri", pattern: /bao tri/ },
          { value: "su_co", pattern: /su co/ },
        ].find((status) => status.pattern.test(normalizedQuestion));

        if (roomStatus) {
          conditions.push("r.status = ?");
          params.push(roomStatus.value);
        }
        if (requestedRoomType) {
          conditions.push("r.type = ?");
          params.push(requestedRoomType.value);
        }
        if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        const [rooms] = await db.query(
          `
            SELECT r.code, r.name, r.capacity, r.type, r.status,
                   f.floor_number, b.code AS building_code
            FROM Rooms r
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE ${conditions.length ? conditions.join(" AND ") : "1 = 1"}
            ORDER BY b.code, f.floor_number, r.code
          `,
          params,
        );
        const statusLabels = {
          trong: "trống",
          dang_hoc: "đang học",
          bao_tri: "đang bảo trì",
          su_co: "có sự cố",
        };
        const roomList = rooms
          .map(
            (room) =>
              `${room.code} (${room.capacity} chỗ, tầng ${room.floor_number}, Tòa ${room.building_code}, ${statusLabels[room.status] || room.status})`,
          )
          .join("; ");
        const typeLabel = requestedRoomType
          ? ` ${requestedRoomType.label}`
          : "";
        const statusLabel = roomStatus
          ? ` ${statusLabels[roomStatus.value]}`
          : "";
        const responseText = rooms.length
          ? `Có ${rooms.length} phòng${typeLabel}${statusLabel} ${buildingScope.label}: ${roomList}.`
          : `Không tìm thấy phòng${typeLabel}${statusLabel} ${buildingScope.label} phù hợp trong dữ liệu hệ thống.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const asksRoomCount =
        normalizedQuestion.includes("phong") &&
        !/(thiet bi|phieu)/.test(normalizedQuestion) &&
        /(bao nhieu|co may|may phong|so luong|tong so)/.test(
          normalizedQuestion,
        );

      if (asksRoomCount) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const stats = await RoomModel.getStats(buildingScope.codes);

        const total = Number(stats?.total) || 0;
        const available = Number(stats?.trong) || 0;
        const occupied = Number(stats?.dang_hoc) || 0;
        const maintenance = Number(stats?.bao_tri) || 0;
        const incident = Number(stats?.su_co) || 0;

        let count = total;
        let label = "phòng";

        if (/(phong trong|con trong|dang trong)/.test(normalizedQuestion)) {
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
          `Hiện có ${count} ${label} ${buildingScope.label}. ` +
          `Tổng số ${total} phòng ${buildingScope.label} gồm ${available} phòng trống, ` +
          `${occupied} phòng đang học, ${maintenance} phòng bảo trì ` +
          `và ${incident} phòng có sự cố.`;

        await saveChatAnswer(req.user.id, message, responseText);

        return res.json({ response: responseText });
      }

      const deviceStatus = [
        { value: "hong", label: "bị hỏng", pattern: /(hong|loi|hu hong)/ },
        {
          value: "dang_sua",
          label: "đang sửa",
          pattern: /(dang sua|dang sua chua|sua chua)/,
        },
        { value: "tat", label: "đã tắt", pattern: /(tat|ngat|ngung hoat dong)/ },
        {
          value: "hoat_dong",
          label: "đang hoạt động",
          pattern: /(hoat dong|dang chay|binh thuong)/,
        },
      ].find((item) => item.pattern.test(normalizedQuestion));
      const asksDeviceCount = /(bao nhieu|co may|tong so|so luong|thong ke)/.test(
        normalizedQuestion,
      );
      const asksDeviceList = /(nao|danh sach|liet ke|thiet bi nao)/.test(
        normalizedQuestion,
      );
      const asksDeviceQuestion =
        normalizedQuestion.includes("thiet bi") &&
        !/(bao tri|phieu)/.test(normalizedQuestion) &&
        (Boolean(deviceStatus) || asksDeviceCount || asksDeviceList || Boolean(roomCode));

      if (asksDeviceQuestion) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const conditions = [];
        const params = [];

        if (deviceStatus) {
          conditions.push("d.status = ?");
          params.push(deviceStatus.value);
        }
        if (roomCode) {
          conditions.push("UPPER(r.code) = ?");
          params.push(roomCode);
        } else if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        if (!deviceStatus && !roomCode && !buildingScope.codes.length) {
          const deviceStats = await getDeviceStats();
          const total = Number(deviceStats?.total) || 0;
          const active = Number(deviceStats?.active) || 0;
          const off = Number(deviceStats?.off) || 0;
          const broken = Number(deviceStats?.broken) || 0;
          const repairing = Number(deviceStats?.repairing) || 0;
          const responseText =
            `Hệ thống ghi nhận ${total} thiết bị: ${active} đang hoạt động, ` +
            `${off} đã tắt, ${broken} bị hỏng và ${repairing} đang sửa. ` +
            `Thiết bị đã tắt không đồng nghĩa với thiết bị bị hỏng.`;
          await saveChatAnswer(req.user.id, message, responseText);
          return res.json({ response: responseText });
        }

        const whereClause = conditions.length
          ? `WHERE ${conditions.join(" AND ")}`
          : "";
        const [devices] = await db.query(
          `
            SELECT d.name, d.status, dt.name AS device_type,
                   r.code AS room_code, b.code AS building_code
            FROM Devices d
            JOIN DeviceTypes dt ON d.device_type_id = dt.id
            JOIN Rooms r ON d.room_id = r.id
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            ${whereClause}
            ORDER BY b.code, r.code, d.name
          `,
          params,
        );
        const statusLabel = deviceStatus?.label || "";
        const scopeLabel = roomCode
          ? `trong phòng ${roomCode}`
          : buildingScope.label;
        const resultLabel = statusLabel
          ? `thiết bị ${statusLabel}`
          : "thiết bị";
        const shouldList = asksDeviceList || Boolean(roomCode);
        const visibleDevices = devices.slice(0, 20);
        const deviceList = shouldList && visibleDevices.length
          ? ` Danh sách: ${visibleDevices
              .map((device) => `${device.name} (${device.room_code}, Tòa ${device.building_code})`)
              .join("; ")}${devices.length > visibleDevices.length ? `; còn ${devices.length - visibleDevices.length} thiết bị khác` : ""}.`
          : "";
        const responseText = devices.length
          ? `Có ${devices.length} ${resultLabel} ${scopeLabel}.${deviceList}`
          : `Không tìm thấy ${resultLabel} ${scopeLabel} trong dữ liệu hiện tại.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const asksIncidentQuestion =
        normalizedQuestion.includes("su co") &&
        (Boolean(roomCode) ||
          /(dang xay ra|dang xu ly|bao nhieu|co may|nao|danh sach|liet ke|hien tai|da giai quyet|co su co khong)/.test(
            normalizedQuestion,
          ));

      if (asksIncidentQuestion) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const conditions = [];
        const params = [];
        const resolvedOnly = /(da giai quyet|da xu ly|da khac phuc)/.test(
          normalizedQuestion,
        );
        const inProgressOnly = /dang xu ly/.test(normalizedQuestion);

        if (resolvedOnly) {
          conditions.push("i.status = ?");
          params.push("da_giai_quyet");
        } else if (inProgressOnly) {
          conditions.push("i.status = ?");
          params.push("dang_xu_ly");
        } else if (!/(tong so|tat ca|lich su)/.test(normalizedQuestion)) {
          conditions.push("i.status IN (?, ?)");
          params.push("dang_xay_ra", "dang_xu_ly");
        }

        if (roomCode) {
          conditions.push("UPPER(r.code) = ?");
          params.push(roomCode);
        } else if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        const [incidents] = await db.query(
          `
            SELECT i.type, i.description, i.severity, i.status, i.occurred_at,
                   r.code AS room_code, b.code AS building_code
            FROM Incidents i
            JOIN Rooms r ON i.room_id = r.id
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE ${conditions.length ? conditions.join(" AND ") : "1 = 1"}
            ORDER BY i.occurred_at DESC
          `,
          params,
        );
        const scopeLabel = roomCode
          ? `tại phòng ${roomCode}`
          : buildingScope.label;
        const incidentList = incidents.length
          ? ` Chi tiết: ${incidents
              .slice(0, 15)
              .map((incident) => {
                const incidentTypeLabels = {
                  dieu_hoa_hong: "Điều hòa hỏng",
                  may_chieu_hong: "Máy chiếu hỏng",
                  mat_dien: "Mất điện",
                };
                const severityLabels = {
                  thap: "thấp",
                  trung: "trung bình",
                  cao: "cao",
                  nghiem_trong: "nghiêm trọng",
                };
                const status =
                  incident.status === "dang_xay_ra"
                    ? "đang xảy ra"
                    : incident.status === "dang_xu_ly"
                      ? "đang xử lý"
                      : "đã giải quyết";
                return `${incidentTypeLabels[incident.type] || incident.type}, phòng ${incident.room_code} (Tòa ${incident.building_code}), mức ${severityLabels[incident.severity] || incident.severity}, ${status}${incident.description ? `: ${incident.description}` : ""}`;
              })
              .join("; ")}${incidents.length > 15 ? `; còn ${incidents.length - 15} sự cố khác` : ""}.`
          : "";
        const openCount = incidents.filter((incident) =>
          ["dang_xay_ra", "dang_xu_ly"].includes(incident.status),
        ).length;
        const responseText = incidents.length
          ? `Tìm thấy ${incidents.length} sự cố ${scopeLabel}; trong đó ${openCount} sự cố chưa giải quyết.${incidentList}`
          : `Hiện không có sự cố phù hợp ${scopeLabel} trong dữ liệu hệ thống.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const asksMaintenanceRecords =
        /(bao tri|phieu)/.test(normalizedQuestion) &&
        (Boolean(roomCode) ||
          /(bao nhieu|co may|nao|danh sach|liet ke|cho xu ly|dang sua|dang mo|hien tai|thong ke|lich su)/.test(
            normalizedQuestion,
          ));

      if (asksMaintenanceRecords) {
        const buildingScope = getBuildingScope(normalizedQuestion);
        const conditions = [];
        const params = [];
        const completedOnly = /(da xong|da hoan tat|da giai quyet)/.test(
          normalizedQuestion,
        );
        const pendingOnly = /cho xu ly/.test(normalizedQuestion);
        const repairingOnly = /dang sua/.test(normalizedQuestion);

        if (completedOnly) {
          conditions.push("m.status = ?");
          params.push("da_xong");
        } else if (pendingOnly) {
          conditions.push("m.status = ?");
          params.push("cho_xu_ly");
        } else if (repairingOnly) {
          conditions.push("m.status = ?");
          params.push("dang_sua");
        } else if (!/(tong so|tat ca|lich su)/.test(normalizedQuestion)) {
          conditions.push("m.status IN (?, ?)");
          params.push("cho_xu_ly", "dang_sua");
        }

        if (roomCode) {
          conditions.push("UPPER(r.code) = ?");
          params.push(roomCode);
        } else if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        const [maintenanceItems] = await db.query(
          `
            SELECT m.status, m.description, m.created_at,
                   d.name AS device_name, dt.name AS device_type,
                   r.code AS room_code, b.code AS building_code
            FROM Maintenance m
            JOIN Devices d ON m.device_id = d.id
            JOIN DeviceTypes dt ON d.device_type_id = dt.id
            JOIN Rooms r ON d.room_id = r.id
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE ${conditions.length ? conditions.join(" AND ") : "1 = 1"}
            ORDER BY m.created_at DESC
          `,
          params,
        );
        const scopeLabel = roomCode
          ? `tại phòng ${roomCode}`
          : buildingScope.label;
        const maintenanceList = maintenanceItems.length
          ? ` Chi tiết: ${maintenanceItems
              .slice(0, 15)
              .map((item) => {
                const status =
                  item.status === "cho_xu_ly"
                    ? "chờ xử lý"
                    : item.status === "dang_sua"
                      ? "đang sửa"
                      : "đã xong";
                return `${item.device_name} (${item.device_type}), phòng ${item.room_code} (Tòa ${item.building_code}), ${status}${item.description ? `: ${item.description}` : ""}`;
              })
              .join("; ")}${maintenanceItems.length > 15 ? `; còn ${maintenanceItems.length - 15} phiếu khác` : ""}.`
          : "";
        const openCount = maintenanceItems.filter((item) =>
          ["cho_xu_ly", "dang_sua"].includes(item.status),
        ).length;
        const responseText = maintenanceItems.length
          ? `Có ${maintenanceItems.length} phiếu bảo trì ${scopeLabel}; ${openCount} phiếu còn mở.${maintenanceList}`
          : `Hiện không có phiếu bảo trì phù hợp ${scopeLabel} trong dữ liệu hệ thống.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const asksScheduleQuestion = /(lich hoc|thoi khoa bieu|lich thi)/.test(
        normalizedQuestion,
      );

      if (asksScheduleQuestion) {
        const requestedDate = getRequestedDate(normalizedQuestion);
        if (!requestedDate) {
          const responseText =
            "Để tra đúng thời khóa biểu trong hệ thống, bạn cho mình ngày cụ thể (ví dụ 15/10/2026) hoặc nói ‘hôm nay’/‘ngày mai’ nhé.";
          await saveChatAnswer(req.user.id, message, responseText);
          return res.json({ response: responseText });
        }

        const buildingScope = getBuildingScope(normalizedQuestion);
        const conditions = ["s.class_date = ?"];
        const params = [requestedDate];
        const time = getVietnamCurrentDateTime().time;
        const asksCurrentSchedule = /(dang dien ra|hien tai)/.test(
          normalizedQuestion,
        );
        const asksExamSchedule = /lich thi/.test(normalizedQuestion);

        if (asksCurrentSchedule) {
          conditions.push("s.start_time <= ?", "s.end_time > ?");
          params.push(time, time);
        }
        if (asksExamSchedule) {
          conditions.push("s.session_type = ?");
          params.push("exam");
        }
        if (buildingScope.codes.length) {
          conditions.push(
            `UPPER(b.code) IN (${buildingScope.codes.map(() => "?").join(", ")})`,
          );
          params.push(...buildingScope.codes);
        }

        const [schedules] = await db.query(
          `
            SELECT s.subject, s.session_type, s.instructor,
                   s.start_time, s.end_time, r.code AS room_code,
                   r.capacity, b.code AS building_code, f.floor_number
            FROM Schedules s
            JOIN Rooms r ON s.room_id = r.id
            JOIN Floors f ON r.floor_id = f.id
            JOIN Buildings b ON f.building_id = b.id
            WHERE ${conditions.join(" AND ")}
            ORDER BY s.start_time, b.code, r.code
          `,
          params,
        );
        const sessionLabels = {
          theory: "lý thuyết",
          practical: "thực hành",
          exam: "thi",
        };
        const scheduleDetails = schedules
          .slice(0, 20)
          .map(
            (schedule) =>
              `${formatTime(schedule.start_time)}–${formatTime(schedule.end_time)}: ${schedule.subject} (${sessionLabels[schedule.session_type] || schedule.session_type}), phòng ${schedule.room_code}, Tòa ${schedule.building_code} tầng ${schedule.floor_number}${schedule.instructor ? `, GV ${schedule.instructor}` : ""}`,
          )
          .join("; ");
        const scheduleScope =
          `${asksExamSchedule ? "Lịch thi" : "Thời khóa biểu"} ngày ${date} ${buildingScope.label}`;
        const responseText = schedules.length
          ? `${scheduleScope}: ${scheduleDetails}${schedules.length > 20 ? `; còn ${schedules.length - 20} buổi khác` : ""}.`
          : `Không có ${asksExamSchedule ? "lịch thi" : "buổi học"} nào được ghi nhận ngày ${date} ${buildingScope.label}.`;

        await saveChatAnswer(req.user.id, message, responseText);
        return res.json({ response: responseText });
      }

      const systemContext = await getChatSystemContext();
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
          WHERE r.status = 'trong' AND r.power_status = 'co_dien'
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
