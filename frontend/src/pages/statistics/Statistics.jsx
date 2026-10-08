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
import { TrendingUp, TrendingDown } from "lucide-react";

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
  const [overview, setOverview] = useState(null);
  const [buildingData, setBuildingData] = useState([]);
  const [incidentWeekly, setIncidentWeekly] = useState([]);
  const [maintenanceMonthly, setMaintenanceMonthly] = useState([]);
  const [topRooms, setTopRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ov, bd, iw, mm, tr] = await Promise.all([
        api.get("/statistics/overview"),
        api.get("/statistics/rooms-by-building"),
        api.get("/statistics/incidents-weekly"),
        api.get("/statistics/maintenance-monthly"),
        api.get("/statistics/top-rooms"),
      ]);
      setOverview(ov.data);
      setBuildingData(bd.data);
      setIncidentWeekly(iw.data);
      setMaintenanceMonthly(mm.data);
      setTopRooms(tr.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const roomStats = overview?.roomStats || {};
  const deviceStats = overview?.deviceStats || {};
  const incidentStats = overview?.incidentStats || {};

  const roomPieData = [
    {
      name: "Đang trống",
      value: parseInt(roomStats.trong) || 0,
      color: "#22c55e",
    },
    {
      name: "Đang học",
      value: parseInt(roomStats.dang_hoc) || 0,
      color: "#3b82f6",
    },
    {
      name: "Bảo trì",
      value: parseInt(roomStats.bao_tri) || 0,
      color: "#f59e0b",
    },
    { name: "Sự cố", value: parseInt(roomStats.su_co) || 0, color: "#ef4444" },
  ];

  const devicePieData = [
    {
      name: "Hoạt động",
      value: parseInt(deviceStats.hoat_dong) || 0,
      color: "#22c55e",
    },
    { name: "Đã tắt", value: parseInt(deviceStats.tat) || 0, color: "#6b7280" },
    { name: "Hỏng", value: parseInt(deviceStats.hong) || 0, color: "#ef4444" },
    {
      name: "Đang sửa",
      value: parseInt(deviceStats.dang_sua) || 0,
      color: "#f59e0b",
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
            Dữ liệu thật từ hệ thống Smart Campus
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all"
        >
          🔄 Làm mới
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Tổng phòng học",
            value: roomStats.total || 0,
            sub: `${roomStats.trong || 0} đang trống`,
            trend: "up",
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🏫",
          },
          {
            label: "Tổng thiết bị",
            value: deviceStats.total || 0,
            sub: `${deviceStats.hoat_dong || 0} hoạt động`,
            trend: "up",
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "💡",
          },
          {
            label: "Sự cố ghi nhận",
            value: incidentStats.total || 0,
            sub: `${incidentStats.dang_xay_ra || 0} đang xảy ra`,
            trend: (incidentStats.total || 0) > 5 ? "down" : "up",
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "⚠️",
          },
          {
            label: "Tỷ lệ sử dụng",
            value: `${usageRate}%`,
            sub: `${roomStats.dang_hoc || 0}/${roomStats.total || 0} phòng`,
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
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${s.trend === "up" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
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
            <p className="text-xs font-bold text-gray-500 mt-1">{s.label}</p>
            <p className="text-xs text-gray-300 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-4">
        {/* Room by building */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="mb-4">
            <p className="text-sm font-black text-gray-800">
              Phòng học theo tòa nhà
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              So sánh trạng thái 2 tòa
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buildingData} barGap={4}>
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
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
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

        {/* Room pie */}
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
          <div className="mb-4">
            <p className="text-sm font-black text-gray-800">
              Sự cố 7 ngày gần nhất
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Phân loại sự cố theo ngày
            </p>
          </div>
          {incidentWeekly.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300">
              <p className="text-sm">Không có sự cố trong 7 ngày qua</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={incidentWeekly}>
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
          )}
        </div>

        {/* Device pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Trạng thái thiết bị
          </p>
          <p className="text-xs text-gray-400 mb-3">
            Tổng {deviceStats.total || 0} thiết bị
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
        {/* Maintenance */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Lịch sử bảo trì thiết bị
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Số lần bảo trì theo tháng
          </p>
          {maintenanceMonthly.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300">
              <p className="text-sm">Chưa có dữ liệu bảo trì</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={maintenanceMonthly}>
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
                  dot={{
                    fill: "#1a56db",
                    r: 5,
                    strokeWidth: 2,
                    stroke: "white",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top rooms */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Top phòng đặt nhiều nhất
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Dựa trên lịch sử đặt phòng đã duyệt
          </p>
          {topRooms.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300">
              <p className="text-sm">Chưa có dữ liệu đặt phòng</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topRooms.map((room, i) => {
                const maxCount = topRooms[0]?.booking_count || 1;
                const pct = Math.round((room.booking_count / maxCount) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{
                        background:
                          i === 0 ? "#fef9c3" : i === 1 ? "#f1f5f9" : "#fff7ed",
                        color:
                          i === 0 ? "#ca8a04" : i === 1 ? "#475569" : "#c2410c",
                      }}
                    >
                      {i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `#${i + 1}`}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-black text-blue-600">
                          {room.code}
                        </span>
                        <span className="text-xs text-gray-400">
                          {room.booking_count} lần
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background:
                              "linear-gradient(135deg, #1a56db, #3b82f6)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
