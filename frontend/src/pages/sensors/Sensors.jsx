import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  Activity,
  AlertTriangle,
  Droplets,
  LoaderCircle,
  RefreshCw,
  Sun,
  Thermometer,
  Users,
  Wifi,
  WifiOff,
  Wind,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SENSOR_CONFIG = {
  nhiet_do: {
    label: "Nhiệt độ",
    icon: Thermometer,
    color: "#dc2626",
    unit: "°C",
    min: 18,
    max: 35,
    normal: [20, 28],
    description: "Nhiệt độ không khí trong phòng",
  },
  do_am: {
    label: "Độ ẩm",
    icon: Droplets,
    color: "#2563eb",
    unit: "%",
    min: 0,
    max: 100,
    normal: [40, 70],
    description: "Độ ẩm tương đối trong phòng",
  },
  co2: {
    label: "CO₂",
    icon: Wind,
    color: "#7c3aed",
    unit: "ppm",
    min: 300,
    max: 2000,
    normal: [300, 1000],
    description: "Nồng độ CO₂ trong không khí",
  },
  so_nguoi: {
    label: "Số người",
    icon: Users,
    color: "#ea580c",
    unit: "người",
    min: 0,
    max: 50,
    normal: [0, 40],
    description: "Số người hiện có trong phòng",
  },
  anh_sang: {
    label: "Ánh sáng",
    icon: Sun,
    color: "#ca8a04",
    unit: "lux",
    min: 0,
    max: 1000,
    normal: [300, 800],
    description: "Cường độ ánh sáng trong phòng",
  },
  khoi: {
    label: "Khói",
    icon: Activity,
    color: "#475569",
    unit: "ppm",
    min: 0,
    max: 100,
    normal: [0, 20],
    description: "Nồng độ khói/bụi trong không khí",
  },
};

const SENSOR_KEYS = Object.keys(SENSOR_CONFIG);

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function createReading(config) {
  const [normalMin, normalMax] = config.normal;
  const range = normalMax - normalMin;
  const value = Number((normalMin + Math.random() * range * 1.3).toFixed(1));

  return {
    value,
    isAlert: value > normalMax * 1.1 || value < normalMin * 0.8,
  };
}

function createHistory(config, currentValue, count = 12) {
  const [normalMin, normalMax] = config.normal;
  const range = normalMax - normalMin;

  return Array.from({ length: count }, (_, index) => {
    const value =
      index === count - 1
        ? currentValue
        : Number(
            (
              normalMin +
              Math.random() * range +
              (Math.random() - 0.5) * range * 0.2
            ).toFixed(1),
          );

    return {
      time: `${String(index * 2).padStart(2, "0")}:00`,
      value,
    };
  });
}

function getSensorSnapshot() {
  const readings = {};
  const histories = {};

  SENSOR_KEYS.forEach((key) => {
    const config = SENSOR_CONFIG[key];
    const reading = createReading(config);

    readings[key] = reading;
    histories[key] = createHistory(config, reading.value);
  });

  return { readings, histories };
}

function formatTime(date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function SensorTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-slate-700">{label}</p>
      <p
        className="text-xs font-bold"
        style={{ color: payload[0]?.stroke || "#2563eb" }}
      >
        {payload[0]?.value} {payload[0]?.name}
      </p>
    </div>
  );
}

function SensorCard({ type, reading, selected, onClick }) {
  const config = SENSOR_CONFIG[type];
  const Icon = config.icon;
  const value = reading?.value ?? config.normal[0];
  const progress = clamp(
    ((value - config.min) / (config.max - config.min)) * 100,
    0,
    100,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${
        selected ? "ring-2" : ""
      }`}
      style={{
        borderColor: selected || reading?.isAlert ? config.color : "#e2e8f0",
        ringColor: config.color,
        boxShadow: reading?.isAlert
          ? `0 4px 18px ${config.color}20`
          : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ color: config.color, backgroundColor: `${config.color}12` }}
        >
          <Icon size={20} />
        </span>
        {reading?.isAlert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
            <AlertTriangle size={12} />
            Cảnh báo
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {config.label}
      </p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
        {value}
        <span className="ml-1 text-sm font-medium text-slate-400">
          {config.unit}
        </span>
      </p>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{config.min}</span>
        <span>
          Bình thường: {config.normal[0]}–{config.normal[1]} {config.unit}
        </span>
        <span>{config.max}</span>
      </div>
    </button>
  );
}

export default function Sensors() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState("nhiet_do");
  const [sensorData, setSensorData] = useState({});
  const [chartData, setChartData] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      setRoomsError("");

      const response = await api.get("/rooms");
      const roomList = Array.isArray(response.data) ? response.data : [];

      setRooms(roomList);
      setSelectedRoom((current) => {
        if (!current) return roomList[0] || null;
        return (
          roomList.find((room) => room.id === current.id) || roomList[0] || null
        );
      });
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
      setRoomsError(
        error.response?.data?.message || "Không thể tải danh sách phòng.",
      );
      setRooms([]);
      setSelectedRoom(null);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const updateSensorData = useCallback(() => {
    const snapshot = getSensorSnapshot();
    setSensorData(snapshot.readings);
    setChartData(snapshot.histories);
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    if (!selectedRoom) return;

    updateSensorData();

    if (!autoRefresh) return undefined;

    const intervalId = window.setInterval(updateSensorData, 3000);
    return () => window.clearInterval(intervalId);
  }, [selectedRoom, autoRefresh, updateSensorData]);

  const alerts = useMemo(
    () => Object.entries(sensorData).filter(([, reading]) => reading?.isAlert),
    [sensorData],
  );

  const selectedConfig = SENSOR_CONFIG[selectedSensor];
  const SelectedIcon = selectedConfig.icon;

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Activity size={16} />
            <span>Giám sát môi trường</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Cảm biến IoT
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi chỉ số môi trường trong các phòng học.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            {autoRefresh ? (
              <Wifi size={16} className="text-green-600" />
            ) : (
              <WifiOff size={16} className="text-slate-400" />
            )}
            <span className="text-xs font-medium text-slate-600">
              {autoRefresh
                ? `Cập nhật ${formatTime(lastUpdate)}`
                : "Đã tạm dừng"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAutoRefresh((current) => !current)}
            disabled={!selectedRoom}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              autoRefresh
                ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            <RefreshCw
              size={16}
              className={autoRefresh ? "animate-spin" : ""}
            />
            {autoRefresh ? "Dừng cập nhật" : "Tiếp tục"}
          </button>
        </div>
      </header>

      {loadingRooms ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
          <LoaderCircle size={28} className="animate-spin text-blue-600" />
          <p className="text-sm">Đang tải danh sách phòng...</p>
        </div>
      ) : roomsError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          <p className="font-semibold">{roomsError}</p>
          <button
            type="button"
            onClick={fetchRooms}
            className="mt-3 rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100"
          >
            Thử lại
          </button>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
          <p className="font-semibold text-slate-800">Chưa có phòng học</p>
          <p className="mt-1 text-sm text-slate-500">
            Thêm phòng học để xem thông tin cảm biến.
          </p>
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                  <AlertTriangle size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-red-800">
                    {alerts.length} chỉ số đang vượt ngưỡng tại phòng{" "}
                    {selectedRoom?.code}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alerts.map(([type, reading]) => (
                      <span
                        key={type}
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-red-700"
                      >
                        {SENSOR_CONFIG[type].label}: {reading.value}{" "}
                        {SENSOR_CONFIG[type].unit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
            <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-1">
              <div className="border-b border-slate-100 px-4 py-4">
                <h2 className="font-semibold text-slate-900">Chọn phòng</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {rooms.length} phòng trong hệ thống
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto p-3 xl:max-h-[620px] xl:flex-col xl:overflow-y-auto">
                {rooms.map((room) => {
                  const selected = selectedRoom?.id === room.id;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoom(room)}
                      className={`min-w-36 rounded-xl border p-3 text-left transition xl:min-w-0 ${
                        selected
                          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p
                        className={`font-semibold ${
                          selected ? "text-blue-700" : "text-slate-800"
                        }`}
                      >
                        {room.code}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {room.building_name || "Tòa nhà"} · Tầng{" "}
                        {room.floor_number ?? "—"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="space-y-5 xl:col-span-3">
              <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Đang xem dữ liệu phòng
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {selectedRoom?.code}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRoom?.building_name || "Tòa nhà"} · Tầng{" "}
                    {selectedRoom?.floor_number ?? "—"} ·{" "}
                    {selectedRoom?.capacity ?? "—"} chỗ
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      autoRefresh
                        ? "animate-pulse bg-green-500"
                        : "bg-slate-300"
                    }`}
                  />
                  {autoRefresh ? "Đang cập nhật mô phỏng" : "Đang tạm dừng"}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {SENSOR_KEYS.map((type) => (
                  <SensorCard
                    key={type}
                    type={type}
                    reading={sensorData[type]}
                    selected={selectedSensor === type}
                    onClick={() => setSelectedSensor(type)}
                  />
                ))}
              </section>

              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          color: selectedConfig.color,
                          backgroundColor: `${selectedConfig.color}12`,
                        }}
                      >
                        <SelectedIcon size={19} />
                      </span>
                      <div>
                        <h2 className="font-semibold text-slate-900">
                          {selectedConfig.label}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {selectedConfig.description}
                        </p>
                      </div>
                    </div>
                    <p
                      className="shrink-0 text-xl font-bold"
                      style={{ color: selectedConfig.color }}
                    >
                      {sensorData[selectedSensor]?.value ??
                        selectedConfig.normal[0]}{" "}
                      <span className="text-xs font-medium text-slate-500">
                        {selectedConfig.unit}
                      </span>
                    </p>
                  </div>

                  {chartData[selectedSensor]?.length ? (
                    <ResponsiveContainer width="100%" height={230}>
                      <AreaChart data={chartData[selectedSensor]}>
                        <defs>
                          <linearGradient
                            id="sensorChartFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={selectedConfig.color}
                              stopOpacity={0.22}
                            />
                            <stop
                              offset="95%"
                              stopColor={selectedConfig.color}
                              stopOpacity={0.02}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          width={45}
                          tick={{ fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<SensorTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          name={selectedConfig.unit}
                          stroke={selectedConfig.color}
                          strokeWidth={2.5}
                          fill="url(#sensorChartFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                      Chưa có dữ liệu biểu đồ
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4">
                    <h2 className="font-semibold text-slate-900">
                      Tổng quan cảm biến
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Chọn một chỉ số để xem biểu đồ chi tiết.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {SENSOR_KEYS.map((type) => {
                      const config = SENSOR_CONFIG[type];
                      const Icon = config.icon;
                      const reading = sensorData[type];
                      const value = reading?.value ?? config.normal[0];
                      const percentage = clamp(
                        ((value - config.min) / (config.max - config.min)) *
                          100,
                        0,
                        100,
                      );

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedSensor(type)}
                          className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                            selectedSensor === type
                              ? "bg-slate-50 ring-1 ring-slate-200"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              color: config.color,
                              backgroundColor: `${config.color}12`,
                            }}
                          >
                            <Icon size={17} />
                          </span>

                          <span className="w-20 shrink-0 text-xs font-semibold text-slate-600">
                            {config.label}
                          </span>

                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <span
                              className="block h-full rounded-full transition-all"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: config.color,
                              }}
                            />
                          </span>

                          <span
                            className="w-20 shrink-0 text-right text-xs font-bold"
                            style={{
                              color: reading?.isAlert
                                ? config.color
                                : "#475569",
                            }}
                          >
                            {value} {config.unit}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
}
