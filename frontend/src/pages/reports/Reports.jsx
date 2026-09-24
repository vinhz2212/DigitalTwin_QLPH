import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileText,
  BarChart3,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-black text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [r, d, i, b] = await Promise.all([
        api.get("/rooms"),
        api.get("/devices"),
        api.get("/incidents"),
        api.get("/bookings"),
      ]);
      setRooms(r.data);
      setDevices(d.data);
      setIncidents(i.data);
      setBookings(b.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data
      .map((row) =>
        Object.values(row)
          .map((v) =>
            typeof v === "string" && v.includes(",") ? `"${v}"` : (v ?? ""),
          )
          .join(","),
      )
      .join("\n");
    const csv = `\uFEFF${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toLocaleDateString("vi-VN").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type) => {
    setExporting(type);
    await new Promise((r) => setTimeout(r, 500));

    const exportMap = {
      rooms: {
        data: rooms.map((r) => ({
          "Mã phòng": r.code,
          "Tên phòng": r.name,
          "Tòa nhà": r.building_name,
          Tầng: r.floor_number,
          "Sức chứa": r.capacity,
          Loại: r.type,
          "Trạng thái": r.status,
        })),
        filename: "bao_cao_phong_hoc",
      },
      devices: {
        data: devices.map((d) => ({
          "Tên thiết bị": d.name,
          Loại: d.type_name,
          Phòng: d.room_code,
          "Tòa nhà": d.building_name,
          "Trạng thái": d.status,
          "Ngày lắp": d.installed_at
            ? new Date(d.installed_at).toLocaleDateString("vi-VN")
            : "--",
        })),
        filename: "bao_cao_thiet_bi",
      },
      incidents: {
        data: incidents.map((i) => ({
          Phòng: i.room_code,
          "Tòa nhà": i.building_name,
          "Loại sự cố": i.type,
          "Mức độ": i.severity,
          "Trạng thái": i.status,
          "Thời gian": new Date(i.occurred_at).toLocaleString("vi-VN"),
          "Mô tả": i.description || "--",
        })),
        filename: "bao_cao_su_co",
      },
      bookings: {
        data: bookings.map((b) => ({
          Phòng: b.room_code,
          "Người đặt": b.user_name,
          Ngày: new Date(b.date).toLocaleDateString("vi-VN"),
          "Giờ bắt đầu": b.start_time,
          "Giờ kết thúc": b.end_time,
          "Mục đích": b.purpose || "--",
          "Trạng thái": b.status,
        })),
        filename: "bao_cao_dat_phong",
      },
    };

    const exp = exportMap[type];
    if (exp) exportCSV(exp.data, exp.filename);
    setExporting("");
  };

  // Chart data
  const roomPieData = [
    {
      name: "Đang trống",
      value: rooms.filter((r) => r.status === "trong").length,
      color: "#22c55e",
    },
    {
      name: "Đang học",
      value: rooms.filter((r) => r.status === "dang_hoc").length,
      color: "#3b82f6",
    },
    {
      name: "Bảo trì",
      value: rooms.filter((r) => r.status === "bao_tri").length,
      color: "#f59e0b",
    },
    {
      name: "Sự cố",
      value: rooms.filter((r) => r.status === "su_co").length,
      color: "#ef4444",
    },
  ];

  const buildingData = ["A", "B"].map((b) => ({
    name: `Tòa ${b}`,
    total: rooms.filter((r) => r.building_code === b).length,
    trong: rooms.filter((r) => r.building_code === b && r.status === "trong")
      .length,
    dang_hoc: rooms.filter(
      (r) => r.building_code === b && r.status === "dang_hoc",
    ).length,
  }));

  const devicePieData = [
    {
      name: "Hoạt động",
      value: devices.filter((d) => d.status === "hoat_dong").length,
      color: "#22c55e",
    },
    {
      name: "Đã tắt",
      value: devices.filter((d) => d.status === "tat").length,
      color: "#6b7280",
    },
    {
      name: "Hỏng",
      value: devices.filter((d) => d.status === "hong").length,
      color: "#ef4444",
    },
    {
      name: "Đang sửa",
      value: devices.filter((d) => d.status === "dang_sua").length,
      color: "#f59e0b",
    },
  ];

  const reportCards = [
    {
      id: "rooms",
      title: "Báo cáo Phòng học",
      desc: `${rooms.length} phòng học`,
      icon: "🏫",
      color: "#3b82f6",
      bg: "#eff6ff",
      stats: [
        {
          label: "Đang trống",
          value: rooms.filter((r) => r.status === "trong").length,
          color: "#22c55e",
        },
        {
          label: "Đang học",
          value: rooms.filter((r) => r.status === "dang_hoc").length,
          color: "#3b82f6",
        },
        {
          label: "Bảo trì",
          value: rooms.filter((r) => r.status === "bao_tri").length,
          color: "#f59e0b",
        },
        {
          label: "Sự cố",
          value: rooms.filter((r) => r.status === "su_co").length,
          color: "#ef4444",
        },
      ],
    },
    {
      id: "devices",
      title: "Báo cáo Thiết bị",
      desc: `${devices.length} thiết bị`,
      icon: "💡",
      color: "#22c55e",
      bg: "#f0fdf4",
      stats: [
        {
          label: "Hoạt động",
          value: devices.filter((d) => d.status === "hoat_dong").length,
          color: "#22c55e",
        },
        {
          label: "Đã tắt",
          value: devices.filter((d) => d.status === "tat").length,
          color: "#6b7280",
        },
        {
          label: "Hỏng",
          value: devices.filter((d) => d.status === "hong").length,
          color: "#ef4444",
        },
        {
          label: "Đang sửa",
          value: devices.filter((d) => d.status === "dang_sua").length,
          color: "#f59e0b",
        },
      ],
    },
    {
      id: "incidents",
      title: "Báo cáo Sự cố",
      desc: `${incidents.length} sự cố ghi nhận`,
      icon: "⚠️",
      color: "#ef4444",
      bg: "#fef2f2",
      stats: [
        {
          label: "Đang xảy ra",
          value: incidents.filter((i) => i.status === "dang_xay_ra").length,
          color: "#ef4444",
        },
        {
          label: "Đang xử lý",
          value: incidents.filter((i) => i.status === "dang_xu_ly").length,
          color: "#f59e0b",
        },
        {
          label: "Đã giải quyết",
          value: incidents.filter((i) => i.status === "da_giai_quyet").length,
          color: "#22c55e",
        },
      ],
    },
    {
      id: "bookings",
      title: "Báo cáo Đặt phòng",
      desc: `${bookings.length} lượt đặt phòng`,
      icon: "📅",
      color: "#f59e0b",
      bg: "#fffbeb",
      stats: [
        {
          label: "Chờ duyệt",
          value: bookings.filter((b) => b.status === "cho_duyet").length,
          color: "#f59e0b",
        },
        {
          label: "Đã duyệt",
          value: bookings.filter((b) => b.status === "da_duyet").length,
          color: "#22c55e",
        },
        {
          label: "Từ chối",
          value: bookings.filter((b) => b.status === "tu_choi").length,
          color: "#ef4444",
        },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Báo cáo</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Xuất báo cáo và phân tích dữ liệu hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle size={16} className="text-green-600" />
          <span className="text-sm font-bold text-green-700">
            Dữ liệu thời gian thực
          </span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Tổng phòng học",
            value: rooms.length,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🏫",
            trend: "+0%",
          },
          {
            label: "Tổng thiết bị",
            value: devices.length,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "💡",
            trend: "+0%",
          },
          {
            label: "Tổng sự cố",
            value: incidents.length,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "⚠️",
            trend: "",
          },
          {
            label: "Tổng đặt phòng",
            value: bookings.length,
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: "📅",
            trend: "",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: s.bg }}
              >
                {s.icon}
              </div>
              {s.trend && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-600">
                  <TrendingUp size={10} className="inline mr-1" />
                  {s.trend}
                </span>
              )}
            </div>
            <p className="text-3xl font-black" style={{ color: s.color }}>
              {loading ? "--" : s.value}
            </p>
            <p className="text-xs font-bold text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-2 gap-4">
        {reportCards.map((r) => (
          <div
            key={r.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all"
          >
            {/* Card header */}
            <div
              className="p-5 border-b border-gray-100"
              style={{ background: `linear-gradient(135deg, white, ${r.bg})` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
                    style={{
                      background: r.bg,
                      border: `1px solid ${r.color}20`,
                    }}
                  >
                    {r.icon}
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleExport(r.id)}
                  disabled={exporting === r.id || loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${r.color}, ${r.color}cc)`,
                    boxShadow: `0 4px 12px ${r.color}40`,
                  }}
                >
                  {exporting === r.id ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download size={13} /> Xuất CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3">
                {r.stats.map((s, i) => (
                  <div
                    key={i}
                    className="text-center p-3 rounded-xl border border-gray-100 hover:border-blue-200 transition-all"
                  >
                    <p
                      className="text-2xl font-black"
                      style={{ color: s.color }}
                    >
                      {loading ? "--" : s.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Building chart */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">
                Phòng học theo tòa nhà
              </p>
              <p className="text-xs text-gray-400">
                Tổng quan, trống và đang học
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={buildingData} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="total"
                name="Tổng"
                fill="#1a56db"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="trong"
                name="Trống"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="dang_hoc"
                name="Đang học"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <FileText size={16} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-800">
                Trạng thái thiết bị
              </p>
              <p className="text-xs text-gray-400">
                Tổng {devices.length} thiết bị
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={devicePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="white"
                >
                  {devicePieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {devicePieData.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-gray-500 font-medium">{d.name}</span>
                </div>
                <span className="font-black" style={{ color: d.color }}>
                  {loading ? "--" : d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export All */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Download size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-black text-gray-800">
              Xuất báo cáo tổng hợp
            </p>
            <p className="text-xs text-gray-400">Tải xuống dữ liệu dạng CSV</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: "rooms", label: "🏫 Xuất phòng học", color: "#3b82f6" },
            { id: "devices", label: "💡 Xuất thiết bị", color: "#22c55e" },
            { id: "incidents", label: "⚠️ Xuất sự cố", color: "#ef4444" },
            { id: "bookings", label: "📅 Xuất đặt phòng", color: "#f59e0b" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleExport(btn.id)}
              disabled={exporting === btn.id || loading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${btn.color}, ${btn.color}cc)`,
                boxShadow: `0 4px 12px ${btn.color}35`,
              }}
            >
              {exporting === btn.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download size={15} />
              )}
              {exporting === btn.id ? "Đang xuất..." : btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
