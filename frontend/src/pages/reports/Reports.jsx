import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Wrench,
} from "lucide-react";

const ROOM_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626"];
const DEVICE_COLORS = ["#16a34a", "#64748b", "#dc2626", "#d97706"];

const ROOM_TYPE_LABELS = {
  ly_thuyet: "Lý thuyết",
  thuc_hanh: "Thực hành",
  hoi_truong: "Hội trường",
};
const ROOM_STATUS_LABELS = {
  trong: "Đang trống",
  dang_hoc: "Đang sử dụng",
  bao_tri: "Bảo trì",
  su_co: "Sự cố",
};
const DEVICE_STATUS_LABELS = {
  hoat_dong: "Hoạt động",
  tat: "Đã tắt",
  hong: "Hỏng",
  dang_sua: "Đang sửa",
};
const DEVICE_TYPE_LABELS = {
  den: "Đèn",
  dieu_hoa: "Điều hòa",
  may_chieu: "Máy chiếu",
  quat: "Quạt",
  loa: "Loa",
  may_tinh: "Máy tính",
};
const INCIDENT_TYPE_LABELS = {
  mat_dien: "Mất điện",
  dieu_hoa_hong: "Điều hòa hỏng",
  may_chieu_hong: "Máy chiếu hỏng",
  hong_thiet_bi: "Hỏng thiết bị",
  nhiet_do_cao: "Nhiệt độ cao",
  chay_no: "Cháy nổ",
  ngap_nuoc: "Ngập nước",
  an_ninh: "An ninh",
  khac: "Khác",
};
const INCIDENT_STATUS_LABELS = {
  dang_xay_ra: "Đang xảy ra",
  dang_xu_ly: "Đang xử lý",
  da_giai_quyet: "Đã giải quyết",
};
const INCIDENT_SEVERITY_LABELS = {
  thap: "Thấp",
  trung: "Trung bình",
  cao: "Cao",
  nghiem_trong: "Nghiêm trọng",
};
const MAINTENANCE_STATUS_LABELS = {
  cho_xu_ly: "Chờ xử lý",
  dang_sua: "Đang sửa",
  da_xong: "Đã xong",
};
const BOOKING_STATUS_LABELS = {
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  tu_choi: "Từ chối",
  da_huy: "Đã hủy",
};
const SESSION_TYPE_LABELS = {
  theory: "Lý thuyết",
  practical: "Thực hành",
  exam: "Thi",
};

function formatDateValue(value, includeTime = false) {
  if (!value) return "--";
  const text = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);

  if (dateOnly && !includeTime) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text;
  return includeTime
    ? date.toLocaleString("vi-VN")
    : date.toLocaleDateString("vi-VN");
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
      {label && (
        <p className="mb-1 text-xs font-semibold text-slate-700">{label}</p>
      )}
      {payload.map((item, index) => (
        <p
          key={`${item.dataKey}-${index}`}
          className="text-xs font-semibold"
          style={{ color: item.color || "#334155" }}
        >
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  );
}

function escapeHTML(value) {
  return String(value ?? "--").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function downloadCSV(data, filename) {
  if (!Array.isArray(data) || data.length === 0) {
    window.alert("Không có dữ liệu để xuất.");
    return;
  }

  const headers = Object.keys(data[0]);

  const escapeCSV = (value) => {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(","),
  );

  const csv = `\uFEFF${headers.map(escapeCSV).join(",")}\r\n${rows.join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openReportPDF(data, title, filename) {
  if (!Array.isArray(data) || data.length === 0) {
    window.alert("Không có dữ liệu để xuất.");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    window.alert(
      "Trình duyệt đã chặn cửa sổ xuất PDF. Hãy cho phép cửa sổ bật lên rồi thử lại.",
    );
    return;
  }

  const headers = Object.keys(data[0]);

  const tableHead = headers
    .map((header) => `<th>${escapeHTML(header)}</th>`)
    .join("");

  const tableRows = data
    .map(
      (row) => `
        <tr>
          ${headers
            .map((header) => `<td>${escapeHTML(row[header])}</td>`)
            .join("")}
        </tr>
      `,
    )
    .join("");

  const safeTitle = escapeHTML(title);
  const safeFilename = escapeHTML(filename);
  const exportedAt = escapeHTML(new Date().toLocaleString("vi-VN"));

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeFilename}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 14mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 8px;
            color: #1e293b;
            font-family: Arial, "Segoe UI", sans-serif;
          }

          h1 {
            margin: 0 0 6px;
            font-size: 22px;
          }

          .meta {
            margin: 0 0 18px;
            color: #64748b;
            font-size: 12px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 7px 8px;
            text-align: left;
            vertical-align: top;
            overflow-wrap: anywhere;
          }

          th {
            background: #eff6ff;
            color: #1e3a8a;
            font-weight: 700;
          }

          tr:nth-child(even) {
            background: #f8fafc;
          }

          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <h1>${safeTitle}</h1>
        <p class="meta">
          Ngày xuất: ${exportedAt}
          · Tổng số dòng: ${data.length}
        </p>

        <table>
          <thead>
            <tr>${tableHead}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        <script>
          window.addEventListener("load", () => {
            window.focus();
            window.print();
          });
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function ReportCard({ report, exporting, loading, onExport }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div
        className="border-b border-slate-100 p-5"
        style={{
          background: `linear-gradient(135deg, white, ${report.background})`,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: report.color }}
            >
              <report.icon size={21} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-slate-900">
                {report.title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {report.description}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => onExport(report.id, "csv")}
              disabled={loading || Boolean(exporting)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === `${report.id}-csv` ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              CSV
            </button>

            <button
              type="button"
              onClick={() => onExport(report.id, "pdf")}
              disabled={loading || Boolean(exporting)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting === `${report.id}-pdf` ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        {report.stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center"
          >
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {loading ? "--" : stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function Reports() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = useCallback(async (mode = "initial") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      if (mode === "initial") setLoading(true);

      setErrorMessage("");

      const response = await api.get("/reports/data", {
        params: {
          ...(appliedRange.from ? { from: appliedRange.from } : {}),
          ...(appliedRange.to ? { to: appliedRange.to } : {}),
        },
      });
      const data = response.data || {};

      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setDevices(Array.isArray(data.devices) ? data.devices : []);
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
      setMaintenance(Array.isArray(data.maintenance) ? data.maintenance : []);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setSchedules(Array.isArray(data.schedules) ? data.schedules : []);
      setGeneratedAt(data.generated_at || "");
    } catch (error) {
      console.error("Không thể tải dữ liệu báo cáo:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Không thể tải dữ liệu báo cáo. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useSocket({
    rooms_changed: () => fetchData("silent"),
    devices_changed: () => fetchData("silent"),
    device_status_changed: () => fetchData("silent"),
    incident_created: () => fetchData("silent"),
    incident_updated: () => fetchData("silent"),
    incident_deleted: () => fetchData("silent"),
    incident_simulated: () => fetchData("silent"),
    incident_resolved: () => fetchData("silent"),
    maintenance_changed: () => fetchData("silent"),
    booking_created: () => fetchData("silent"),
    booking_status_changed: () => fetchData("silent"),
    booking_deleted: () => fetchData("silent"),
    schedule_changed: () => fetchData("silent"),
  });

  const applyDateRange = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setErrorMessage("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }
    const nextRange = { from: fromDate, to: toDate };
    if (
      nextRange.from === appliedRange.from &&
      nextRange.to === appliedRange.to
    ) {
      fetchData("refresh");
      return;
    }
    setAppliedRange(nextRange);
  };

  const clearDateRange = () => {
    setFromDate("");
    setToDate("");
    if (!appliedRange.from && !appliedRange.to) {
      fetchData("refresh");
      return;
    }
    setAppliedRange({ from: "", to: "" });
  };

  const exportMap = useMemo(
    () => ({
      rooms: {
        title: "Báo cáo phòng học",
        filename: "bao_cao_phong_hoc",
        data: rooms.map((room) => ({
          "Mã phòng": room.code,
          "Tên phòng": room.name,
          "Tòa nhà": room.building_name,
          Tầng: room.floor_number,
          "Sức chứa": room.capacity,
          Loại: ROOM_TYPE_LABELS[room.type] || room.type,
          "Trạng thái": ROOM_STATUS_LABELS[room.status] || room.status,
        })),
      },
      devices: {
        title: "Báo cáo thiết bị",
        filename: "bao_cao_thiet_bi",
        data: devices.map((device) => ({
          "Tên thiết bị": device.name,
          Loại: DEVICE_TYPE_LABELS[device.type_name] || device.type_name,
          Phòng: device.room_code,
          "Tòa nhà": device.building_name,
          "Trạng thái": DEVICE_STATUS_LABELS[device.status] || device.status,
          "Ngày lắp": formatDateValue(device.installed_at),
          "Bảo trì gần nhất": formatDateValue(device.last_maintenance),
        })),
      },
      incidents: {
        title: "Báo cáo sự cố",
        filename: "bao_cao_su_co",
        data: incidents.map((incident) => ({
          Phòng: incident.room_code,
          "Tòa nhà": incident.building_name,
          "Loại sự cố": INCIDENT_TYPE_LABELS[incident.type] || incident.type,
          "Mức độ":
            INCIDENT_SEVERITY_LABELS[incident.severity] || incident.severity,
          "Trạng thái":
            INCIDENT_STATUS_LABELS[incident.status] || incident.status,
          "Thời gian": formatDateValue(incident.occurred_at, true),
          "Hoàn tất": formatDateValue(incident.resolved_at, true),
          "Mô tả": incident.description || "--",
        })),
      },
      maintenance: {
        title: "Báo cáo bảo trì",
        filename: "bao_cao_bao_tri",
        data: maintenance.map((item) => ({
          "Thiết bị": item.device_name,
          Loại: DEVICE_TYPE_LABELS[item.device_type] || item.device_type,
          Phòng: item.room_code,
          "Tòa nhà": item.building_name,
          "Người báo": item.reported_by_name,
          "Người xử lý": item.resolved_by_name || "--",
          "Trạng thái":
            MAINTENANCE_STATUS_LABELS[item.status] || item.status,
          "Ngày tạo": formatDateValue(item.created_at, true),
          "Ngày hoàn tất": formatDateValue(item.resolved_at, true),
          "Mô tả": item.description || "--",
        })),
      },
      bookings: {
        title: "Báo cáo đặt phòng",
        filename: "bao_cao_dat_phong",
        data: bookings.map((booking) => ({
          Phòng: booking.room_code,
          "Người đặt": booking.user_name,
          Ngày: formatDateValue(booking.date),
          "Giờ bắt đầu": String(booking.start_time || "--").slice(0, 5),
          "Giờ kết thúc": String(booking.end_time || "--").slice(0, 5),
          "Mục đích": booking.purpose || "--",
          "Trạng thái":
            BOOKING_STATUS_LABELS[booking.status] || booking.status,
        })),
      },
      schedules: {
        title: "Báo cáo lịch học và lịch thi",
        filename: "bao_cao_lich_hoc_lich_thi",
        data: schedules.map((schedule) => ({
          Phòng: schedule.room_code,
          "Tòa nhà": schedule.building_name,
          "Môn học": schedule.subject,
          "Loại buổi":
            SESSION_TYPE_LABELS[schedule.session_type] ||
            schedule.session_type,
          "Giảng viên": schedule.instructor || "--",
          Ngày: formatDateValue(schedule.class_date),
          "Giờ bắt đầu": String(schedule.start_time || "--").slice(0, 5),
          "Giờ kết thúc": String(schedule.end_time || "--").slice(0, 5),
          "Học kỳ": schedule.semester || "--",
        })),
      },
    }),
    [rooms, devices, incidents, maintenance, bookings, schedules],
  );

  const handleExport = (type, format) => {
    const report = exportMap[type];

    if (!report) return;

    if (!report.data.length) {
      window.alert("Báo cáo này chưa có dữ liệu để xuất.");
      return;
    }

    setExporting(`${type}-${format}`);

    if (format === "pdf") {
      openReportPDF(report.data, report.title, report.filename);
    } else {
      downloadCSV(report.data, report.filename);
    }

    setExporting("");
  };

  const roomPieData = [
    {
      name: "Đang trống",
      value: rooms.filter((room) => room.status === "trong").length,
      color: ROOM_COLORS[0],
    },
    {
      name: "Đang sử dụng",
      value: rooms.filter((room) => room.status === "dang_hoc").length,
      color: ROOM_COLORS[1],
    },
    {
      name: "Bảo trì",
      value: rooms.filter((room) => room.status === "bao_tri").length,
      color: ROOM_COLORS[2],
    },
    {
      name: "Sự cố",
      value: rooms.filter((room) => room.status === "su_co").length,
      color: ROOM_COLORS[3],
    },
  ];

  const buildingData = [
    ...new Set(rooms.map((room) => room.building_code).filter(Boolean)),
  ]
    .sort()
    .map((buildingCode) => {
      const buildingRooms = rooms.filter(
        (room) => room.building_code === buildingCode,
      );

      return {
        name: `Tòa ${buildingCode}`,
        total: buildingRooms.length,
        trong: buildingRooms.filter((room) => room.status === "trong").length,
        dang_hoc: buildingRooms.filter((room) => room.status === "dang_hoc")
          .length,
      };
    });

  const devicePieData = [
    {
      name: "Hoạt động",
      value: devices.filter((device) => device.status === "hoat_dong").length,
      color: DEVICE_COLORS[0],
    },
    {
      name: "Đã tắt",
      value: devices.filter((device) => device.status === "tat").length,
      color: DEVICE_COLORS[1],
    },
    {
      name: "Hỏng",
      value: devices.filter((device) => device.status === "hong").length,
      color: DEVICE_COLORS[2],
    },
    {
      name: "Đang sửa",
      value: devices.filter((device) => device.status === "dang_sua").length,
      color: DEVICE_COLORS[3],
    },
  ];

  const reports = [
    {
      id: "rooms",
      title: "Báo cáo phòng học",
      description: `${rooms.length} phòng học`,
      icon: Building2,
      color: "#2563eb",
      background: "#eff6ff",
      stats: [
        {
          label: "Đang trống",
          value: roomPieData[0].value,
          color: ROOM_COLORS[0],
        },
        {
          label: "Đang sử dụng",
          value: roomPieData[1].value,
          color: ROOM_COLORS[1],
        },
        {
          label: "Bảo trì",
          value: roomPieData[2].value,
          color: ROOM_COLORS[2],
        },
        {
          label: "Sự cố",
          value: roomPieData[3].value,
          color: ROOM_COLORS[3],
        },
      ],
    },
    {
      id: "devices",
      title: "Báo cáo thiết bị",
      description: `${devices.length} thiết bị`,
      icon: Wrench,
      color: "#16a34a",
      background: "#f0fdf4",
      stats: [
        {
          label: "Hoạt động",
          value: devicePieData[0].value,
          color: DEVICE_COLORS[0],
        },
        {
          label: "Đã tắt",
          value: devicePieData[1].value,
          color: DEVICE_COLORS[1],
        },
        {
          label: "Hỏng",
          value: devicePieData[2].value,
          color: DEVICE_COLORS[2],
        },
        {
          label: "Đang sửa",
          value: devicePieData[3].value,
          color: DEVICE_COLORS[3],
        },
      ],
    },
    {
      id: "incidents",
      title: "Báo cáo sự cố",
      description: `${incidents.length} sự cố ghi nhận`,
      icon: AlertTriangle,
      color: "#dc2626",
      background: "#fef2f2",
      stats: [
        {
          label: "Đang xảy ra",
          value: incidents.filter(
            (incident) => incident.status === "dang_xay_ra",
          ).length,
          color: "#dc2626",
        },
        {
          label: "Đang xử lý",
          value: incidents.filter(
            (incident) => incident.status === "dang_xu_ly",
          ).length,
          color: "#d97706",
        },
        {
          label: "Đã giải quyết",
          value: incidents.filter(
            (incident) => incident.status === "da_giai_quyet",
          ).length,
          color: "#16a34a",
        },
      ],
    },
    {
      id: "bookings",
      title: "Báo cáo đặt phòng",
      description: `${bookings.length} lượt đặt phòng`,
      icon: CheckCircle2,
      color: "#d97706",
      background: "#fffbeb",
      stats: [
        {
          label: "Chờ duyệt",
          value: bookings.filter((booking) => booking.status === "cho_duyet")
            .length,
          color: "#d97706",
        },
        {
          label: "Đã duyệt",
          value: bookings.filter((booking) => booking.status === "da_duyet")
            .length,
          color: "#16a34a",
        },
        {
          label: "Từ chối",
          value: bookings.filter((booking) => booking.status === "tu_choi")
            .length,
          color: "#dc2626",
        },
        {
          label: "Đã hủy",
          value: bookings.filter((booking) => booking.status === "da_huy")
            .length,
          color: "#64748b",
        },
      ],
    },
    {
      id: "maintenance",
      title: "Báo cáo bảo trì",
      description: `${maintenance.length} phiếu bảo trì`,
      icon: ClipboardList,
      color: "#7c3aed",
      background: "#f5f3ff",
      stats: [
        {
          label: "Chờ xử lý",
          value: maintenance.filter((item) => item.status === "cho_xu_ly")
            .length,
          color: "#d97706",
        },
        {
          label: "Đang sửa",
          value: maintenance.filter((item) => item.status === "dang_sua")
            .length,
          color: "#2563eb",
        },
        {
          label: "Đã xong",
          value: maintenance.filter((item) => item.status === "da_xong")
            .length,
          color: "#16a34a",
        },
      ],
    },
    {
      id: "schedules",
      title: "Báo cáo lịch học và lịch thi",
      description: `${schedules.length} buổi học hoặc thi`,
      icon: CalendarDays,
      color: "#0891b2",
      background: "#ecfeff",
      stats: [
        {
          label: "Lý thuyết",
          value: schedules.filter((item) => item.session_type === "theory")
            .length,
          color: "#64748b",
        },
        {
          label: "Thực hành",
          value: schedules.filter((item) => item.session_type === "practical")
            .length,
          color: "#16a34a",
        },
        {
          label: "Thi",
          value: schedules.filter((item) => item.session_type === "exam")
            .length,
          color: "#d97706",
        },
      ],
    },
  ];

  const deviceTotal = devices.length;

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <FileText size={16} />
            <span>Tổng hợp dữ liệu</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Báo cáo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem thống kê và xuất dữ liệu hệ thống.
          </p>
          {generatedAt && (
            <p className="mt-1 text-xs text-slate-400">
              Cập nhật lúc {formatDateValue(generatedAt, true)}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => fetchData("refresh")}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang cập nhật..." : "Làm mới"}
        </button>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchData("refresh")}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100 sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CalendarDays size={18} className="text-blue-600" />
              Lọc dữ liệu theo thời gian
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Áp dụng cho sự cố, bảo trì, đặt phòng và lịch học/lịch thi.
              Phòng học và thiết bị luôn hiển thị trạng thái hiện tại.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Từ ngày
              </span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:w-44"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                Đến ngày
              </span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 xl:w-44"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <button
                type="button"
                onClick={applyDateRange}
                disabled={loading || refreshing}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={clearDateRange}
                disabled={loading || refreshing}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Xóa lọc
              </button>
            </div>
          </div>
        </div>

        {(appliedRange.from || appliedRange.to) && (
          <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
            Đang xem dữ liệu từ {appliedRange.from
              ? formatDateValue(appliedRange.from)
              : "đầu kỳ"}
            {" đến "}
            {appliedRange.to ? formatDateValue(appliedRange.to) : "hiện tại"}.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {[
          {
            label: "Phòng học",
            value: rooms.length,
            icon: Building2,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Thiết bị",
            value: devices.length,
            icon: Wrench,
            color: "#16a34a",
            background: "#f0fdf4",
          },
          {
            label: "Sự cố",
            value: incidents.length,
            icon: AlertTriangle,
            color: "#dc2626",
            background: "#fef2f2",
          },
          {
            label: "Đặt phòng",
            value: bookings.length,
            icon: CheckCircle2,
            color: "#d97706",
            background: "#fffbeb",
          },
          {
            label: "Bảo trì",
            value: maintenance.length,
            icon: ClipboardList,
            color: "#7c3aed",
            background: "#f5f3ff",
          },
          {
            label: "Lịch học / thi",
            value: schedules.length,
            icon: CalendarDays,
            color: "#0891b2",
            background: "#ecfeff",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading ? "--" : item.value}
                </p>
              </div>
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  color: item.color,
                  backgroundColor: item.background,
                }}
              >
                <Icon size={20} />
              </span>
            </div>
          );
        })}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">Xuất báo cáo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chọn CSV để tải bảng dữ liệu hoặc PDF để in/lưu báo cáo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              exporting={exporting}
              loading={loading}
              onExport={handleExport}
            />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 2xl:col-span-2">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">
              Phòng học theo tòa nhà
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              So sánh tổng số phòng, phòng trống và phòng đang sử dụng.
            </p>
          </div>

          {rooms.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu phòng học.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={buildingData} barGap={8}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Tổng phòng"
                  fill="#cbd5e1"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="trong"
                  name="Đang trống"
                  fill="#16a34a"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="dang_hoc"
                  name="Đang sử dụng"
                  fill="#2563eb"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3">
            <h2 className="font-semibold text-slate-900">
              Trạng thái thiết bị
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Tổng {deviceTotal} thiết bị
            </p>
          </div>

          {deviceTotal === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu thiết bị.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    dataKey="value"
                    stroke="white"
                    strokeWidth={3}
                  >
                    {devicePieData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {devicePieData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.name}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: item.color }}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <p className="text-xs text-slate-400">
        PDF được tạo qua hộp thoại in của trình duyệt. Chọn “Lưu dưới dạng PDF”
        để tải file về máy.
      </p>
    </div>
  );
}
