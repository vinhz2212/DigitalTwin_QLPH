import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
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
  CheckCircle2,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Wrench,
} from "lucide-react";

const ROOM_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626"];
const DEVICE_COLORS = ["#16a34a", "#64748b", "#dc2626", "#d97706"];

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
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(","),
  );

  const csv = `\uFEFF${headers.map(escapeCSV).join(",")}\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${filename}_${new Date()
    .toLocaleDateString("vi-VN")
    .replace(/\//g, "-")}.csv`;

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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setErrorMessage("");

      const [roomsRes, devicesRes, incidentsRes, bookingsRes] =
        await Promise.all([
          api.get("/rooms"),
          api.get("/devices"),
          api.get("/incidents"),
          api.get("/bookings"),
        ]);

      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
      setIncidents(Array.isArray(incidentsRes.data) ? incidentsRes.data : []);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
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
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          Loại: room.type,
          "Trạng thái": room.status,
        })),
      },
      devices: {
        title: "Báo cáo thiết bị",
        filename: "bao_cao_thiet_bi",
        data: devices.map((device) => ({
          "Tên thiết bị": device.name,
          Loại: device.type_name,
          Phòng: device.room_code,
          "Tòa nhà": device.building_name,
          "Trạng thái": device.status,
          "Ngày lắp": device.installed_at
            ? new Date(device.installed_at).toLocaleDateString("vi-VN")
            : "--",
        })),
      },
      incidents: {
        title: "Báo cáo sự cố",
        filename: "bao_cao_su_co",
        data: incidents.map((incident) => ({
          Phòng: incident.room_code,
          "Tòa nhà": incident.building_name,
          "Loại sự cố": incident.type,
          "Mức độ": incident.severity,
          "Trạng thái": incident.status,
          "Thời gian": incident.occurred_at
            ? new Date(incident.occurred_at).toLocaleString("vi-VN")
            : "--",
          "Mô tả": incident.description || "--",
        })),
      },
      bookings: {
        title: "Báo cáo đặt phòng",
        filename: "bao_cao_dat_phong",
        data: bookings.map((booking) => ({
          Phòng: booking.room_code,
          "Người đặt": booking.user_name,
          Ngày: booking.date
            ? new Date(booking.date).toLocaleDateString("vi-VN")
            : "--",
          "Giờ bắt đầu": booking.start_time,
          "Giờ kết thúc": booking.end_time,
          "Mục đích": booking.purpose || "--",
          "Trạng thái": booking.status,
        })),
      },
    }),
    [rooms, devices, incidents, bookings],
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

  const buildingData = ["A", "B"].map((buildingCode) => {
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
        </div>

        <button
          type="button"
          onClick={() => fetchData(true)}
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
            onClick={() => fetchData(true)}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100 sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
