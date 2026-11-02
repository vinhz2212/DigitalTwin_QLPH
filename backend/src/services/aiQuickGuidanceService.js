const INCIDENT_GUIDES = {
  chay: {
    assessment: "Nguy hiểm cao.",
    possibleCause: "Chưa xác định; cần kiểm tra khu vực phát cháy và thiết bị liên quan.",
    steps: "Sơ tán, báo người phụ trách và lực lượng cứu hỏa. Giữ nguồn điện ở trạng thái ngắt, chỉ cấp lại sau khi đã kiểm tra an toàn.",
    prevention: "Kiểm tra hệ thống báo cháy và thiết bị điện sau sự cố.",
  },
  mat_dien: {
    assessment: "Cần xác định phạm vi mất điện.",
    possibleCause: "Có thể liên quan nguồn cấp hoặc thiết bị bảo vệ; cần kỹ thuật viên kiểm tra.",
    steps: "Kiểm tra trạng thái nguồn của phòng và các phòng lân cận; báo kỹ thuật viên kiểm tra tủ điện, không tự thao tác khi chưa xác nhận an toàn.",
    prevention: "Theo dõi và kiểm tra định kỳ hệ thống điện.",
  },
  may_chieu_hong: {
    assessment: "Cần kiểm tra thiết bị thực tế.",
    possibleCause: "Có thể liên quan nguồn, cáp tín hiệu hoặc máy chiếu.",
    steps: "Giữ thiết bị ở trạng thái ngắt điện, kiểm tra kết nối và nguồn phát; nếu vẫn lỗi, chuyển kỹ thuật viên xử lý.",
    prevention: "Vệ sinh và kiểm tra cáp, bộ lọc theo hướng dẫn của thiết bị.",
  },
  dieu_hoa_hong: {
    assessment: "Cần kiểm tra thiết bị thực tế.",
    possibleCause: "Có thể liên quan nguồn, cài đặt hoặc bộ phận làm mát.",
    steps: "Giữ điều hòa ở trạng thái ngắt điện, kiểm tra cài đặt và dấu hiệu rò nước; kỹ thuật viên kiểm tra trước khi cấp điện lại.",
    prevention: "Vệ sinh bộ lọc và kiểm tra định kỳ.",
  },
  mat_internet: {
    assessment: "Chưa rõ lỗi tại một phòng hay toàn tòa nhà.",
    possibleCause: "Có thể liên quan thiết bị truy cập hoặc đường truyền; cần kiểm tra phạm vi lỗi.",
    steps: "Kiểm tra kết nối của nhiều thiết bị, điểm truy cập và đường truyền; báo quản trị mạng nếu lỗi vẫn còn.",
    prevention: "Theo dõi trạng thái mạng và kiểm tra thiết bị mạng định kỳ.",
  },
  qua_tai: {
    assessment: "Cần kiểm tra số người và mức sử dụng thiết bị thực tế.",
    possibleCause: "Có thể do số người hoặc phụ tải thiết bị vượt mức phù hợp.",
    steps: "Giảm tải, đối chiếu sức chứa phòng và kiểm tra dấu hiệu quá nhiệt; liên hệ người phụ trách nếu có nguy cơ mất an toàn.",
    prevention: "Tuân thủ sức chứa phòng và theo dõi phụ tải.",
  },
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function inferIncidentType(message) {
  const text = normalize(message);
  if (/(chay|hoa hoan|khoi)/.test(text)) return "chay";
  if (/(mat dien|cup dien)/.test(text)) return "mat_dien";
  if (/(may chieu)/.test(text) && /(hong|loi|khong len)/.test(text)) return "may_chieu_hong";
  if (/(dieu hoa|may lanh)/.test(text) && /(hong|loi)/.test(text)) return "dieu_hoa_hong";
  if (/(mat internet|mat mang|loi mang)/.test(text)) return "mat_internet";
  if (/(qua tai|qua dong)/.test(text)) return "qua_tai";
  return null;
}

function getCauseFromDescription(type, description) {
  const text = normalize(description);
  const clues = {
    chay: [
      [/qua tai(?: dien| nguon)?|dien qua tai/, "Quá tải điện làm dây dẫn hoặc thiết bị quá nhiệt"],
      [/chap dien|cham chap|tia lua/, "Chập điện tạo nhiệt hoặc tia lửa"],
    ],
    mat_dien: [
      [/qua tai(?: dien| nguon)?|dien qua tai/, "Quá tải điện"],
      [/nhay aptomat|nhay cb|sap cau dao/, "Thiết bị bảo vệ điện đã ngắt"],
    ],
    may_chieu_hong: [
      [/\bmo\b|khong ro|nhoe|lay net/, "Lấy nét chưa đúng, ống kính bẩn hoặc tín hiệu hình ảnh"],
      [/khong len hinh|khong co hinh|khong hien thi/, "Nguồn, cáp hoặc đầu vào tín hiệu"],
    ],
    dieu_hoa_hong: [
      [/khong mat|kem mat|khong lanh/, "Cài đặt làm lạnh, bộ lọc hoặc luồng gió"],
      [/ro nuoc|chay nuoc/, "Đường thoát nước hoặc bộ phận làm lạnh"],
    ],
    mat_internet: [
      [/wifi|wi-fi|diem truy cap/, "Điểm truy cập Wi-Fi hoặc kết nối của thiết bị"],
    ],
    qua_tai: [
      [/qua dong|qua so nguoi|dong nguoi/, "Số người vượt sức chứa phù hợp"],
      [/qua tai dien|nhieu thiet bi/, "Phụ tải điện của nhiều thiết bị"],
    ],
  };
  const match = clues[type]?.find(([pattern]) => pattern.test(text));
  return match ? `${match[1]} (theo mô tả, chưa xác minh).` : null;
}

function buildIncidentGuidance(type, roomCode, description = "") {
  const guide = INCIDENT_GUIDES[type];
  if (!guide) return null;
  const location = roomCode ? ` tại phòng ${roomCode}` : "";
  const possibleCause = getCauseFromDescription(type, description) || guide.possibleCause;
  return `Tình huống sự cố${location}: ${guide.assessment}\nNguyên nhân có thể: ${possibleCause}\nXử lý: ${guide.steps}\nPhòng ngừa: ${guide.prevention}`;
}

function getMaintenanceChecklist(deviceType, issue) {
  const normalized = normalize(issue);
  if (deviceType === "may_chieu") {
    if (/(\bmo\b|khong ro|nhoe|lay net)/.test(normalized)) {
      return "Kiểm tra lấy nét, độ phân giải và nguồn tín hiệu; sau khi tắt máy, vệ sinh mặt ngoài ống kính theo hướng dẫn của thiết bị. Nếu vẫn mờ, chuyển kỹ thuật viên kiểm tra.";
    }
    if (/(khong len hinh|khong co hinh|mat hinh|khong hien thi)/.test(normalized)) {
      return "Kiểm tra nguồn, cáp và đúng đầu vào tín hiệu. Nếu thiết bị vẫn không hiển thị, giữ nguồn ở trạng thái ngắt và chuyển kỹ thuật viên.";
    }
  }
  if (deviceType === "dieu_hoa") {
    if (/(khong mat|kem mat|khong lanh)/.test(normalized)) {
      return "Kiểm tra chế độ làm lạnh, nhiệt độ cài đặt và bộ lọc. Nếu luồng gió vẫn yếu hoặc không mát, chuyển kỹ thuật viên kiểm tra; không tự can thiệp môi chất lạnh.";
    }
    if (/(ro nuoc|chay nuoc|tieng on|keu to)/.test(normalized)) {
      return "Tắt thiết bị, kiểm tra dấu hiệu rò nước hoặc tiếng ồn bất thường và chuyển kỹ thuật viên kiểm tra trước khi dùng lại.";
    }
  }
  return null;
}

function buildMaintenanceGuidance({ device_name, device_type, issue, similarCase }) {
  const checklist = getMaintenanceChecklist(device_type, issue);
  if (!checklist) return null;
  const previousCase = similarCase
    ? `\nPhiếu tương tự đã hoàn tất: ${similarCase}`
    : "";
  return `Đề xuất cho ${device_name}: chưa thể xác định nguyên nhân chỉ từ mô tả “${issue}”.\n1. ${checklist}${previousCase}\n2. Chỉ ấn định thời gian và lịch bảo trì sau khi kiểm tra thực tế, đối chiếu lịch học và được phê duyệt.`;
}

function buildMaintenanceFallback({ device_name, issue, similarCase }) {
  const previousCase = similarCase
    ? ` Phiếu tương tự đã hoàn tất ghi: ${similarCase}`
    : "";
  return `Chưa đủ dữ liệu để chẩn đoán ${device_name} từ mô tả “${issue}”. Kiểm tra tình trạng thực tế, ghi nhận lỗi và chuyển kỹ thuật viên; chỉ lên lịch sau khi xác định công việc và thời lượng.${previousCase} Gemini hiện chưa phản hồi nên đây là hướng xử lý ban đầu.`;
}

module.exports = {
  inferIncidentType,
  buildIncidentGuidance,
  buildMaintenanceGuidance,
  buildMaintenanceFallback,
};
