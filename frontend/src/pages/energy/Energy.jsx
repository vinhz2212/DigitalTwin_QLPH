import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  LoaderCircle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

const PERIODS = [
  { id: "day", label: "Ngày" },
  { id: "week", label: "Tuần" },
  { id: "month", label: "Tháng" },
];

const formatCost = (value) => {
  const amount = Number(value) || 0;

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} triệu ₫`;
  }

  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)} nghìn ₫`;
  }

  return `${amount} ₫`;
};

function EnergyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-700">{label}</p>
      {payload.map((item, index) => {
        const isCost = item.dataKey === "cost";

        return (
          <p
            key={`${item.dataKey}-${index}`}
            className="text-xs font-semibold"
            style={{ color: item.color || "#334155" }}
          >
            {item.name}: {isCost ? `${item.value} k₫` : `${item.value} kWh`}
          </p>
        );
      })}
    </div>
  );
}

function KpiCard({ label, value, description, icon: Icon, color, background }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ color, backgroundColor: background }}
        >
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-4">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

export default function Energy() {
  const [period, setPeriod] = useState("day");
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [deviceData, setDeviceData] = useState([]);
  const [topRooms, setTopRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setErrorMessage("");

        const [summaryResult, chartResult, devicesResult, roomsResult] =
          await Promise.allSettled([
            api.get("/energy/summary"),
            api.get(`/energy/chart?period=${period}`),
            api.get("/energy/devices"),
            api.get("/energy/top-rooms"),
          ]);

        const failures = [];

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value.data || null);
        } else {
          setSummary(null);
          failures.push("tổng quan");
        }

        if (chartResult.status === "fulfilled") {
          setChartData(
            Array.isArray(chartResult.value.data) ? chartResult.value.data : [],
          );
        } else {
          setChartData([]);
          failures.push("biểu đồ");
        }

        if (devicesResult.status === "fulfilled") {
          setDeviceData(
            Array.isArray(devicesResult.value.data)
              ? devicesResult.value.data
              : [],
          );
        } else {
          setDeviceData([]);
          failures.push("phân bổ thiết bị");
        }

        if (roomsResult.status === "fulfilled") {
          setTopRooms(
            Array.isArray(roomsResult.value.data) ? roomsResult.value.data : [],
          );
        } else {
          setTopRooms([]);
          failures.push("danh sách phòng");
        }

        if (failures.length) {
          setErrorMessage(
            `Không tải được dữ liệu: ${failures.join(", ")}. Hãy kiểm tra kết nối rồi thử lại.`,
          );
        }
      } catch (error) {
        console.error("Không thể tải dữ liệu điện năng:", error);
        setErrorMessage(
          error.response?.data?.message ||
            "Không thể tải dữ liệu điện năng. Vui lòng thử lại.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
        setChartLoading(false);
      }
    },
    [period],
  );

  useEffect(() => {
    setChartLoading(true);
    fetchData();
  }, [fetchData]);

  const todayKwh = Number(summary?.today_kwh) || 0;
  const weeklyKwh = Number(summary?.weekly_kwh) || 0;
  const activeDevices = Number(summary?.active_devices) || 0;
  const alertsCount = Number(summary?.alerts_count) || 0;

  const kpis = [
    {
      label: "Điện năng hôm nay",
      value: `${todayKwh.toLocaleString("vi-VN")} kWh`,
      description: `${activeDevices} thiết bị đang hoạt động`,
      icon: Zap,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "Chi phí hôm nay",
      value: formatCost(summary?.today_cost),
      description: "Chi phí ước tính",
      icon: Activity,
      color: "#d97706",
      background: "#fffbeb",
    },
    {
      label: "Điện năng tuần này",
      value: `${weeklyKwh.toLocaleString("vi-VN")} kWh`,
      description: "Tổng trong 7 ngày gần nhất",
      icon: TrendingDown,
      color: "#16a34a",
      background: "#f0fdf4",
    },
    {
      label: "Cảnh báo tiêu thụ",
      value: alertsCount,
      description: "Thiết bị cần kiểm tra",
      icon: AlertTriangle,
      color: "#dc2626",
      background: "#fef2f2",
    },
  ];

  const chartTitle =
    period === "day"
      ? "Điện năng tiêu thụ trong ngày"
      : period === "week"
        ? "So sánh điện năng hai tòa nhà"
        : "Điện năng tiêu thụ theo tháng";

  const chartSubtitle =
    period === "day"
      ? "Theo giờ · kWh và chi phí ước tính"
      : period === "week"
        ? "Theo ngày · kWh"
        : "Theo tháng · kWh và chi phí ước tính";

  if (loading) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-slate-500">
        <LoaderCircle size={30} className="animate-spin text-blue-600" />
        <p className="text-sm">Đang tải dữ liệu điện năng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Zap size={16} />
            <span>Giám sát tiêu thụ</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Điện năng tiêu thụ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi điện năng và chi phí ước tính của hệ thống.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  period === item.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchData(true)}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-amber-800 shadow-sm hover:bg-amber-100 sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <Panel
        title={chartTitle}
        subtitle={chartSubtitle}
        className="overflow-hidden"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {period === "day"
              ? `Hôm nay: ${todayKwh.toLocaleString("vi-VN")} kWh`
              : period === "week"
                ? `Tuần này: ${weeklyKwh.toLocaleString("vi-VN")} kWh`
                : "Dữ liệu theo tháng"}
          </p>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {PERIODS.find((item) => item.id === period)?.label}
          </span>
        </div>

        {chartLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle size={26} className="animate-spin text-blue-600" />
          </div>
        ) : chartData.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu biểu đồ cho khoảng thời gian này." />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {period === "day" ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="energyKwhFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient
                    id="energyCostFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                <Tooltip content={<EnergyTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="kwh"
                  name="Điện năng"
                  stroke="#2563eb"
                  fill="url(#energyKwhFill)"
                  strokeWidth={2.5}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Chi phí"
                  stroke="#16a34a"
                  fill="url(#energyCostFill)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            ) : period === "week" ? (
              <BarChart data={chartData} barGap={8}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                <Tooltip content={<EnergyTooltip />} />
                <Legend />
                <Bar
                  dataKey="toaA"
                  name="Tòa A"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="toaB"
                  name="Tòa B"
                  fill="#16a34a"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
                <Tooltip content={<EnergyTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="kwh"
                  name="Điện năng"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Chi phí"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <Panel
          title="Phân bổ điện năng theo thiết bị"
          subtitle={`Tổng tiêu thụ hôm nay: ${todayKwh.toLocaleString("vi-VN")} kWh`}
        >
          {deviceData.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu phân bổ theo thiết bị." />
          ) : (
            <div className="space-y-4">
              {deviceData.map((device, index) => {
                const percent = Math.max(
                  0,
                  Math.min(Number(device.value) || 0, 100),
                );
                const color = device.color || "#64748b";

                return (
                  <div
                    key={device.code || device.name || index}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold"
                      style={{
                        color,
                        backgroundColor: `${color}16`,
                      }}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-700">
                          {device.name || "Thiết bị"}
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {device.kwh ?? 0} kWh · {percent}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Phòng tiêu thụ cao"
          subtitle="Ước tính điện năng theo phòng trong ngày"
        >
          {topRooms.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu phòng tiêu thụ." />
          ) : (
            <div className="space-y-3">
              {topRooms.map((room, index) => {
                const rising = room.trend === "up";

                return (
                  <div
                    key={room.room || index}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-blue-700">
                          {room.room || "Phòng"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {room.room_name || "Phòng học"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold text-slate-700">
                        {room.kwh ?? 0} kWh
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          rising
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {rising ? (
                          <TrendingUp size={13} />
                        ) : (
                          <TrendingDown size={13} />
                        )}
                        {rising ? "Tăng" : "Giảm"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <p className="text-xs text-slate-400">
        Lưu ý: một số chỉ số và biểu đồ được backend mô phỏng; số liệu này chưa
        phải dữ liệu công tơ điện thực tế.
      </p>
    </div>
  );
}
