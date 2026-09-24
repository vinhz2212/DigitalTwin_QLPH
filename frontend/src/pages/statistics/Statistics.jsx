import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

const roomUsageData = [
  { name: "T2", A: 85, B: 72 },
  { name: "T3", A: 90, B: 68 },
  { name: "T4", A: 75, B: 80 },
  { name: "T5", A: 88, B: 75 },
  { name: "T6", A: 70, B: 65 },
  { name: "T7", A: 40, B: 35 },
];

const incidentData = [
  { date: "23/05", chay: 1, mat_dien: 2, may_chieu: 3, dieu_hoa: 1 },
  { date: "24/05", chay: 0, mat_dien: 1, may_chieu: 2, dieu_hoa: 2 },
  { date: "25/05", chay: 2, mat_dien: 0, may_chieu: 1, dieu_hoa: 0 },
  { date: "26/05", chay: 0, mat_dien: 2, may_chieu: 4, dieu_hoa: 1 },
  { date: "27/05", chay: 1, mat_dien: 1, may_chieu: 2, dieu_hoa: 3 },
  { date: "28/05", chay: 0, mat_dien: 0, may_chieu: 1, dieu_hoa: 1 },
  { date: "29/05", chay: 1, mat_dien: 2, may_chieu: 3, dieu_hoa: 2 },
];

const maintenanceData = [
  { month: "T1", count: 12 },
  { month: "T2", count: 8 },
  { month: "T3", count: 15 },
  { month: "T4", count: 10 },
  { month: "T5", count: 18 },
  { month: "T6", count: 14 },
];

const energyData = [
  { date: "23/05", kwh: 80 },
  { date: "24/05", kwh: 120 },
  { date: "25/05", kwh: 95 },
  { date: "26/05", kwh: 140 },
  { date: "27/05", kwh: 110 },
  { date: "28/05", kwh: 160 },
  { date: "29/05", kwh: 420 },
];

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

export default function Statistics() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [r, d, i] = await Promise.all([
        api.get("/rooms"),
        api.get("/devices"),
        api.get("/incidents"),
      ]);
      setRooms(r.data);
      setDevices(d.data);
      setIncidents(i.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const roomStats = {
    total: rooms.length,
    trong: rooms.filter((r) => r.status === "trong").length,
    dang_hoc: rooms.filter((r) => r.status === "dang_hoc").length,
    bao_tri: rooms.filter((r) => r.status === "bao_tri").length,
    su_co: rooms.filter((r) => r.status === "su_co").length,
  };

  const deviceStats = {
    total: devices.length,
    hoat_dong: devices.filter((d) => d.status === "hoat_dong").length,
    hong: devices.filter((d) => d.status === "hong").length,
    dang_sua: devices.filter((d) => d.status === "dang_sua").length,
  };

  const roomPieData = [
    { name: "Đang trống", value: roomStats.trong, color: "#22c55e" },
    { name: "Đang học", value: roomStats.dang_hoc, color: "#3b82f6" },
    { name: "Bảo trì", value: roomStats.bao_tri, color: "#f59e0b" },
    { name: "Sự cố", value: roomStats.su_co, color: "#ef4444" },
  ];

  const devicePieData = [
    { name: "Hoạt động", value: deviceStats.hoat_dong, color: "#22c55e" },
    { name: "Hỏng", value: deviceStats.hong, color: "#ef4444" },
    { name: "Đang sửa", value: deviceStats.dang_sua, color: "#f59e0b" },
    {
      name: "Đã tắt",
      value:
        deviceStats.total -
        deviceStats.hoat_dong -
        deviceStats.hong -
        deviceStats.dang_sua,
      color: "#6b7280",
    },
  ];

  const usageRate =
    roomStats.total > 0
      ? Math.round((roomStats.dang_hoc / roomStats.total) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Thống kê & Phân tích
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Tổng hợp dữ liệu hệ thống Smart Campus
          </p>
        </div>
        <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          {[
            { id: "week", label: "7 ngày" },
            { id: "month", label: "30 ngày" },
            { id: "year", label: "1 năm" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background:
                  period === p.id
                    ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                    : "transparent",
                color: period === p.id ? "white" : "#6b7280",
                boxShadow:
                  period === p.id ? "0 4px 12px rgba(26,86,219,0.3)" : "none",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Tổng phòng học",
            value: roomStats.total,
            sub: `${roomStats.trong} đang trống`,
            trend: "up",
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🏫",
          },
          {
            label: "Tổng thiết bị",
            value: deviceStats.total,
            sub: `${deviceStats.hoat_dong} hoạt động`,
            trend: "up",
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "💡",
          },
          {
            label: "Sự cố ghi nhận",
            value: incidents.length,
            sub: `${incidents.filter((i) => i.status === "dang_xay_ra").length} đang xảy ra`,
            trend: incidents.length > 5 ? "down" : "up",
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "⚠️",
          },
          {
            label: "Tỷ lệ sử dụng",
            value: `${usageRate}%`,
            sub: `${roomStats.dang_hoc}/${roomStats.total} phòng`,
            trend: "up",
            color: "#8b5cf6",
            bg: "#f5f3ff",
            icon: "📊",
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
              <div
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                  s.trend === "up"
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-500"
                }`}
              >
                {s.trend === "up" ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {s.trend === "up" ? "Tốt" : "Cần xem"}
              </div>
            </div>
            <p className="text-3xl font-black" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-medium">{s.label}</p>
            <p className="text-xs text-gray-300 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Room usage bar chart */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">
                Tỷ lệ sử dụng phòng theo ngày
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                So sánh Tòa A và Tòa B (%)
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 size={16} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={roomUsageData} barGap={4}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="A"
                name="Tòa A"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="B"
                name="Tòa B"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Room status pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Trạng thái phòng học
          </p>
          <p className="text-xs text-gray-400 mb-3">Phân bổ hiện tại</p>
          <div className="flex justify-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={roomPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="white"
                >
                  {roomPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {roomPieData.map((d, i) => (
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
                  {d.value} (
                  {roomStats.total > 0
                    ? Math.round((d.value / roomStats.total) * 100)
                    : 0}
                  %)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Incident area chart */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-black text-gray-800">
                Sự cố theo thời gian
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Phân loại sự cố trong tuần
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={incidentData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="chay"
                name="Cháy"
                stroke="#ef4444"
                fill="#fecaca"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="mat_dien"
                name="Mất điện"
                stroke="#f59e0b"
                fill="#fde68a"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="may_chieu"
                name="Máy chiếu"
                stroke="#8b5cf6"
                fill="#ddd6fe"
                strokeWidth={2}
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="dieu_hoa"
                name="Điều hòa"
                stroke="#3b82f6"
                fill="#bfdbfe"
                strokeWidth={2}
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Trạng thái thiết bị
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Tổng {deviceStats.total} thiết bị
          </p>
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
          <div className="space-y-1.5 mt-2">
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
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Maintenance line chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Lịch sử bảo trì thiết bị
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Số lần bảo trì theo tháng
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={maintenanceData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Số lần bảo trì"
                stroke="#1a56db"
                strokeWidth={3}
                dot={{ fill: "#1a56db", r: 5, strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Energy bar chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Điện năng tiêu thụ
          </p>
          <p className="text-xs text-gray-400 mb-4">kWh theo ngày trong tuần</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={energyData}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
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
                dataKey="kwh"
                name="kWh"
                fill="#22c55e"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top rooms */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-black text-gray-800">
              Phòng sử dụng nhiều nhất
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Top 5 phòng có tỷ lệ sử dụng cao nhất
            </p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {rooms.slice(0, 5).map((room, i) => {
            const rate = Math.floor(Math.random() * 20 + 75);
            return (
              <div
                key={room.id}
                className="p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-md transition-all text-center"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black mx-auto mb-2"
                  style={{
                    background:
                      i === 0 ? "#fef9c3" : i === 1 ? "#f1f5f9" : "#fff7ed",
                    color:
                      i === 0 ? "#ca8a04" : i === 1 ? "#475569" : "#c2410c",
                  }}
                >
                  {i === 0
                    ? "#1"
                    : i === 1
                      ? "#2"
                      : i === 2
                        ? "#3"
                        : `#${i + 1}`}
                </div>
                <p className="text-lg font-black text-blue-600">{room.code}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {room.building_name}
                </p>
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${rate}%`,
                        background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                      }}
                    />
                  </div>
                  <p className="text-xs font-black text-blue-600 mt-1">
                    {rate}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
