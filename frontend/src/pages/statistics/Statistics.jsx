import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Building2,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from "lucide-react";

const ROOM_COLORS = ["#16a34a", "#2563eb", "#d97706", "#dc2626"];
const DEVICE_COLORS = ["#16a34a", "#64748b", "#dc2626", "#d97706"];

const numberValue = (value) => Number(value) || 0;

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
          className="text-xs font-medium"
          style={{ color: item.color || item.fill || "#334155" }}
        >
          {item.name}: {item.value}
        </p>
      ))}
    </div>
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

function EmptyChart({ children = "Chưa có dữ liệu" }) {
  return (
    <div className="flex h-52 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
      {children}
    </div>
  );
}

function KpiCard({ label, value, description, icon: Icon, color, background }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
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

function PieLegend({ data }) {
  return (
    <div className="mt-3 space-y-2">
      {data.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-3 text-xs"
        >
          <span className="flex min-w-0 items-center gap-2 text-slate-600">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate">{item.name}</span>
          </span>
          <span className="shrink-0 font-semibold text-slate-800">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Statistics() {
  const [overview, setOverview] = useState(null);
  const [buildingData, setBuildingData] = useState([]);
  const [incidentWeekly, setIncidentWeekly] = useState([]);
  const [maintenanceMonthly, setMaintenanceMonthly] = useState([]);
  const [topRooms, setTopRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchAll = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setErrorMessage("");

      const [overviewRes, buildingRes, incidentsRes, maintenanceRes, roomsRes] =
        await Promise.all([
          api.get("/statistics/overview"),
          api.get("/statistics/rooms-by-building"),
          api.get("/statistics/incidents-weekly"),
          api.get("/statistics/maintenance-monthly"),
          api.get("/statistics/top-rooms"),
        ]);

      setOverview(overviewRes.data || {});
      setBuildingData(Array.isArray(buildingRes.data) ? buildingRes.data : []);
      setIncidentWeekly(
        Array.isArray(incidentsRes.data) ? incidentsRes.data : [],
      );
      setMaintenanceMonthly(
        Array.isArray(maintenanceRes.data) ? maintenanceRes.data : [],
      );
      setTopRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
    } catch (error) {
      console.error("Không thể tải dữ liệu thống kê:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Không thể tải dữ liệu thống kê. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const roomStats = overview?.roomStats || {};
  const deviceStats = overview?.deviceStats || {};
  const incidentStats = overview?.incidentStats || {};
  const bookingStats = overview?.bookingStats || {};

  const roomTotal = numberValue(roomStats.total);
  const deviceTotal = numberValue(deviceStats.total);
  const roomsInUse = numberValue(roomStats.dang_hoc);

  const usageRate =
    roomTotal > 0 ? Math.round((roomsInUse / roomTotal) * 100) : 0;

  const roomPieData = useMemo(
    () => [
      {
        name: "Đang trống",
        value: numberValue(roomStats.trong),
        color: ROOM_COLORS[0],
      },
      {
        name: "Đang sử dụng",
        value: numberValue(roomStats.dang_hoc),
        color: ROOM_COLORS[1],
      },
      {
        name: "Bảo trì",
        value: numberValue(roomStats.bao_tri),
        color: ROOM_COLORS[2],
      },
      {
        name: "Sự cố",
        value: numberValue(roomStats.su_co),
        color: ROOM_COLORS[3],
      },
    ],
    [roomStats],
  );

  const devicePieData = useMemo(
    () => [
      {
        name: "Hoạt động",
        value: numberValue(deviceStats.hoat_dong),
        color: DEVICE_COLORS[0],
      },
      {
        name: "Đã tắt",
        value: numberValue(deviceStats.tat),
        color: DEVICE_COLORS[1],
      },
      {
        name: "Hỏng",
        value: numberValue(deviceStats.hong),
        color: DEVICE_COLORS[2],
      },
      {
        name: "Đang sửa",
        value: numberValue(deviceStats.dang_sua),
        color: DEVICE_COLORS[3],
      },
    ],
    [deviceStats],
  );

  const kpis = [
    {
      label: "Phòng học",
      value: roomTotal,
      description: `${numberValue(roomStats.trong)} phòng đang trống`,
      icon: Building2,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "Thiết bị",
      value: deviceTotal,
      description: `${numberValue(deviceStats.hoat_dong)} thiết bị hoạt động`,
      icon: Activity,
      color: "#16a34a",
      background: "#f0fdf4",
    },
    {
      label: "Sự cố đang xảy ra",
      value: numberValue(incidentStats.dang_xay_ra),
      description: `${numberValue(incidentStats.total)} sự cố được ghi nhận`,
      icon: TriangleAlert,
      color: "#dc2626",
      background: "#fef2f2",
    },
    {
      label: "Tỷ lệ sử dụng phòng",
      value: `${usageRate}%`,
      description: `${roomsInUse} / ${roomTotal} phòng`,
      icon: CalendarDays,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-slate-500">
        <LoaderCircle size={30} className="animate-spin text-blue-600" />
        <p className="text-sm">Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Activity size={16} />
            <span>Tổng quan dữ liệu</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Thống kê &amp; Phân tích
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Số liệu tổng hợp từ hệ thống Smart Campus.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang cập nhật..." : "Làm mới dữ liệu"}
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
            onClick={() => fetchAll(true)}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100 sm:self-auto"
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

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <Panel
          title="Phòng học theo tòa nhà"
          subtitle="So sánh tổng số phòng và trạng thái sử dụng"
          className="2xl:col-span-2"
        >
          {buildingData.length === 0 ? (
            <EmptyChart>Chưa có dữ liệu phòng theo tòa nhà</EmptyChart>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={buildingData} barGap={6}>
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
        </Panel>

        <Panel
          title="Trạng thái phòng"
          subtitle={`${roomTotal} phòng trong hệ thống`}
        >
          {roomTotal === 0 ? (
            <EmptyChart>Chưa có dữ liệu phòng</EmptyChart>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={roomPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="white"
                      strokeWidth={3}
                    >
                      {roomPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">
                    {roomTotal}
                  </span>
                  <span className="text-xs text-slate-500">phòng</span>
                </div>
              </div>
              <PieLegend data={roomPieData} />
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <Panel
          title="Sự cố trong 7 ngày gần nhất"
          subtitle="Số lượng sự cố theo loại và ngày"
          className="2xl:col-span-2"
        >
          {incidentWeekly.length === 0 ? (
            <EmptyChart>Không có sự cố trong 7 ngày qua</EmptyChart>
          ) : (
            <ResponsiveContainer width="100%" height={270}>
              <AreaChart data={incidentWeekly}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
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
                <Area
                  type="monotone"
                  dataKey="chay"
                  name="Cháy"
                  stroke="#dc2626"
                  fill="#fecaca"
                  strokeWidth={2}
                  stackId="incidents"
                />
                <Area
                  type="monotone"
                  dataKey="mat_dien"
                  name="Mất điện"
                  stroke="#d97706"
                  fill="#fde68a"
                  strokeWidth={2}
                  stackId="incidents"
                />
                <Area
                  type="monotone"
                  dataKey="may_chieu"
                  name="Máy chiếu"
                  stroke="#7c3aed"
                  fill="#ddd6fe"
                  strokeWidth={2}
                  stackId="incidents"
                />
                <Area
                  type="monotone"
                  dataKey="dieu_hoa"
                  name="Điều hòa"
                  stroke="#2563eb"
                  fill="#bfdbfe"
                  strokeWidth={2}
                  stackId="incidents"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel
          title="Trạng thái thiết bị"
          subtitle={`${deviceTotal} thiết bị trong hệ thống`}
        >
          {deviceTotal === 0 ? (
            <EmptyChart>Chưa có dữ liệu thiết bị</EmptyChart>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={devicePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="white"
                      strokeWidth={3}
                    >
                      {devicePieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">
                    {deviceTotal}
                  </span>
                  <span className="text-xs text-slate-500">thiết bị</span>
                </div>
              </div>
              <PieLegend data={devicePieData} />
            </>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Panel title="Lịch sử bảo trì" subtitle="Số yêu cầu bảo trì theo tháng">
          {maintenanceMonthly.length === 0 ? (
            <EmptyChart>Chưa có dữ liệu bảo trì</EmptyChart>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={maintenanceMonthly}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
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
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Lượt bảo trì"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{
                    fill: "#2563eb",
                    r: 4,
                    strokeWidth: 2,
                    stroke: "white",
                  }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel
          title="Phòng được đặt nhiều nhất"
          subtitle="Dựa trên các yêu cầu đặt phòng đã duyệt"
        >
          {topRooms.length === 0 ? (
            <EmptyChart>Chưa có dữ liệu đặt phòng</EmptyChart>
          ) : (
            <div className="space-y-4">
              {topRooms.map((room, index) => {
                const count = numberValue(room.booking_count);
                const maxCount = Math.max(
                  numberValue(topRooms[0]?.booking_count),
                  1,
                );
                const percent = Math.round((count / maxCount) * 100);

                return (
                  <div
                    key={`${room.code}-${room.building_code || index}`}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {room.code || "Phòng"}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {room.building_name || room.building_code || ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-600">
                          {count} lượt
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Wrench size={19} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Yêu cầu bảo trì
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {numberValue(
                  maintenanceMonthly.reduce(
                    (sum, item) => sum + numberValue(item.count),
                    0,
                  ),
                )}{" "}
                lượt trong khoảng thống kê
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <CalendarDays size={19} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Đặt phòng đã duyệt
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {numberValue(bookingStats.da_duyet)} yêu cầu được duyệt
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
