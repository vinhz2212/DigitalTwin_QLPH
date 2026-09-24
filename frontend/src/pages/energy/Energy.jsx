import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
} from "lucide-react";
import api from "../../services/api";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-black text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value} {p.name === "cost" ? "k₫" : "kWh"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Energy() {
  const [period, setPeriod] = useState("day");
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [topRooms, setTopRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    fetchDeviceBreakdown();
    fetchTopRooms();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchSummary = async () => {
    try {
      const res = await api.get("/energy/summary");
      setSummary(res.data);
    } catch (error) {
      // Fallback data
      setSummary({
        today_kwh: 420,
        today_cost: 840000,
        weekly_kwh: 2845,
        alerts_count: 3,
        active_devices: 240,
      });
    }
  };

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/energy/chart?period=${period}`);
      setChartData(res.data);
    } catch (error) {
      // Fallback hardcoded
      if (period === "week") {
        setChartData([
          { date: "T2", toaA: 180, toaB: 150 },
          { date: "T3", toaA: 220, toaB: 180 },
          { date: "T4", toaA: 195, toaB: 160 },
          { date: "T5", toaA: 240, toaB: 200 },
          { date: "T6", toaA: 210, toaB: 175 },
          { date: "T7", toaA: 120, toaB: 90 },
          { date: "CN", toaA: 80, toaB: 60 },
        ]);
      } else if (period === "month") {
        setChartData([
          { month: "T1", kwh: 3200, cost: 6400 },
          { month: "T2", kwh: 2800, cost: 5600 },
          { month: "T3", kwh: 3500, cost: 7000 },
          { month: "T4", kwh: 3100, cost: 6200 },
          { month: "T5", kwh: 3800, cost: 7600 },
          { month: "T6", kwh: 4200, cost: 8400 },
          { month: "T7", kwh: 3900, cost: 7800 },
          { month: "T8", kwh: 4100, cost: 8200 },
        ]);
      } else {
        setChartData([
          { time: "00:00", kwh: 12, cost: 24 },
          { time: "02:00", kwh: 8, cost: 16 },
          { time: "04:00", kwh: 6, cost: 12 },
          { time: "06:00", kwh: 15, cost: 30 },
          { time: "08:00", kwh: 45, cost: 90 },
          { time: "10:00", kwh: 68, cost: 136 },
          { time: "12:00", kwh: 72, cost: 144 },
          { time: "14:00", kwh: 80, cost: 160 },
          { time: "16:00", kwh: 75, cost: 150 },
          { time: "18:00", kwh: 55, cost: 110 },
          { time: "20:00", kwh: 35, cost: 70 },
          { time: "22:00", kwh: 20, cost: 40 },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceBreakdown = async () => {
    try {
      const res = await api.get("/energy/devices");
      setDeviceData(res.data);
    } catch (error) {
      setDeviceData([
        { name: "Điều hòa", value: 45, kwh: 189, color: "#3b82f6" },
        { name: "Chiếu sáng", value: 20, kwh: 84, color: "#eab308" },
        { name: "Máy chiếu", value: 15, kwh: 63, color: "#8b5cf6" },
        { name: "Máy tính", value: 12, kwh: 50.4, color: "#22c55e" },
        { name: "Quạt", value: 5, kwh: 21, color: "#06b6d4" },
        { name: "Khác", value: 3, kwh: 12.6, color: "#6b7280" },
      ]);
    }
  };

  const fetchTopRooms = async () => {
    try {
      const res = await api.get("/energy/top-rooms");
      setTopRooms(res.data);
    } catch (error) {
      setTopRooms([
        { room: "A301", kwh: 45.2, trend: "up" },
        { room: "B204", kwh: 42.8, trend: "down" },
        { room: "A502", kwh: 40.1, trend: "up" },
        { room: "B103", kwh: 38.5, trend: "down" },
        { room: "A401", kwh: 36.9, trend: "up" },
      ]);
    }
  };

  const formatCost = (cost) => {
    if (!cost) return "0₫";
    if (cost >= 1000000) return `${(cost / 1000000).toFixed(1)}M₫`;
    if (cost >= 1000) return `${Math.round(cost / 1000)}k₫`;
    return `${cost}₫`;
  };

  const kpiData = summary
    ? [
        {
          label: "Hôm nay",
          value: `${summary.today_kwh} kWh`,
          sub: `${summary.active_devices || 0} thiết bị hoạt động`,
          trend: "up",
          color: "#1a56db",
          bg: "#eff6ff",
          icon: Zap,
        },
        {
          label: "Chi phí hôm nay",
          value: formatCost(summary.today_cost),
          sub: "Ước tính điện phí",
          trend: "up",
          color: "#f59e0b",
          bg: "#fffbeb",
          icon: Activity,
        },
        {
          label: "Tuần này",
          value: `${summary.weekly_kwh} kWh`,
          sub: "Tổng 7 ngày qua",
          trend: "down",
          color: "#22c55e",
          bg: "#f0fdf4",
          icon: TrendingDown,
        },
        {
          label: "Cảnh báo",
          value: `${summary.alerts_count}`,
          sub: "Thiết bị tiêu thụ cao",
          trend: "warn",
          color: "#ef4444",
          bg: "#fef2f2",
          icon: AlertTriangle,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Điện năng tiêu thụ
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Theo dõi và phân tích điện năng toàn khuôn viên (mô phỏng)
          </p>
        </div>
        <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          {[
            { id: "day", label: "Ngày" },
            { id: "week", label: "Tuần" },
            { id: "month", label: "Tháng" },
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
        {kpiData.map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: s.bg }}
              >
                <s.icon size={20} style={{ color: s.color }} />
              </div>
              <div
                className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                  s.trend === "up"
                    ? "bg-red-50 text-red-500"
                    : s.trend === "down"
                      ? "bg-green-50 text-green-600"
                      : "bg-orange-50 text-orange-500"
                }`}
              >
                {s.trend === "up" ? (
                  <TrendingUp size={11} />
                ) : s.trend === "down" ? (
                  <TrendingDown size={11} />
                ) : (
                  <AlertTriangle size={11} />
                )}
                {s.trend === "down"
                  ? "Tiết kiệm"
                  : s.trend === "warn"
                    ? "Cảnh báo"
                    : "Tăng"}
              </div>
            </div>
            <p className="text-2xl font-black" style={{ color: s.color }}>
              {s.value}
            </p>
            <p className="text-xs font-bold text-gray-600 mt-1">{s.label}</p>
            <p className="text-xs text-gray-300 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-black text-gray-800">
              {period === "day"
                ? "Điện năng tiêu thụ trong ngày"
                : period === "week"
                  ? "So sánh điện năng 2 tòa trong tuần"
                  : "Điện năng tiêu thụ theo tháng"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {period === "day"
                ? "Theo giờ (kWh & chi phí)"
                : period === "week"
                  ? "Tòa A vs Tòa B (kWh)"
                  : "Tổng tiêu thụ & chi phí (kWh)"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50">
            <Zap size={14} className="text-blue-600" />
            <span className="text-xs font-black text-blue-600">
              {summary
                ? period === "day"
                  ? `Hôm nay: ${summary.today_kwh} kWh`
                  : period === "week"
                    ? `Tuần này: ${summary.weekly_kwh} kWh`
                    : "Xem theo tháng"
                : "Đang tải..."}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {period === "day" ? (
              <AreaChart data={chartData}>
                <XAxis
                  dataKey="time"
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
                  dataKey="kwh"
                  name="kWh"
                  stroke="#1a56db"
                  fill="#bfdbfe"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="cost"
                  stroke="#22c55e"
                  fill="#bbf7d0"
                  strokeWidth={2.5}
                />
              </AreaChart>
            ) : period === "week" ? (
              <BarChart data={chartData} barGap={4}>
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
                <Bar
                  dataKey="toaA"
                  name="Tòa A"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="toaB"
                  name="Tòa B"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="kwh"
                  name="kWh"
                  stroke="#1a56db"
                  strokeWidth={3}
                  dot={{ fill: "#1a56db", r: 5, strokeWidth: 2, stroke: "white" }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="cost"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: "#22c55e", r: 5, strokeWidth: 2, stroke: "white" }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-3 gap-4">
        {/* Device breakdown */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Phân bổ điện năng theo thiết bị
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Tổng tiêu thụ hôm nay: {summary?.today_kwh || 0} kWh
          </p>
          <div className="space-y-4">
            {deviceData.map((d, i) => (
              <div key={i} className="flex items-center gap-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                  style={{ background: (d.color || "#6b7280") + "18", color: d.color || "#6b7280" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-gray-700">
                      {d.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{d.kwh} kWh</span>
                      <span
                        className="text-xs font-black"
                        style={{ color: d.color || "#6b7280" }}
                      >
                        {d.value}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${d.value}%`,
                        background: `linear-gradient(90deg, ${(d.color || "#6b7280")}88, ${d.color || "#6b7280"})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top rooms */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-black text-gray-800 mb-1">
            Top phòng tiêu thụ cao
          </p>
          <p className="text-xs text-gray-400 mb-4">Hôm nay</p>
          <div className="space-y-3">
            {topRooms.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{
                      background:
                        i === 0
                          ? "#fef9c3"
                          : i === 1
                            ? "#f1f5f9"
                            : i === 2
                              ? "#fff7ed"
                              : "#f9fafb",
                      color:
                        i === 0
                          ? "#ca8a04"
                          : i === 1
                            ? "#475569"
                            : i === 2
                              ? "#c2410c"
                              : "#6b7280",
                    }}
                  >
                    #{i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-blue-600">{r.room}</p>
                    <p className="text-xs text-gray-400">{r.kwh} kWh</p>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                    r.trend === "up"
                      ? "bg-red-50 text-red-500"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {r.trend === "up" ? (
                    <TrendingUp size={11} />
                  ) : (
                    <TrendingDown size={11} />
                  )}
                  {r.trend === "up" ? "Tăng" : "Giảm"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
