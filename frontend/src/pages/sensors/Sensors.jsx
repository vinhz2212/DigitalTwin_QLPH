import { useState, useEffect, useRef } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Users,
  Sun,
  Activity,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";

const SENSOR_CONFIG = {
  nhiet_do: {
    label: "Nhiệt độ",
    icon: Thermometer,
    color: "#ef4444",
    unit: "°C",
    min: 18,
    max: 35,
    normal: [20, 28],
    gradient: ["#fef2f2", "#fecaca"],
  },
  do_am: {
    label: "Độ ẩm",
    icon: Droplets,
    color: "#3b82f6",
    unit: "%",
    min: 0,
    max: 100,
    normal: [40, 70],
    gradient: ["#eff6ff", "#bfdbfe"],
  },
  co2: {
    label: "CO₂",
    icon: Wind,
    color: "#8b5cf6",
    unit: "ppm",
    min: 300,
    max: 2000,
    normal: [300, 1000],
    gradient: ["#f5f3ff", "#ddd6fe"],
  },
  so_nguoi: {
    label: "Số người",
    icon: Users,
    color: "#f97316",
    unit: "người",
    min: 0,
    max: 50,
    normal: [0, 40],
    gradient: ["#fff7ed", "#fed7aa"],
  },
  anh_sang: {
    label: "Ánh sáng",
    icon: Sun,
    color: "#eab308",
    unit: "lux",
    min: 0,
    max: 1000,
    normal: [300, 800],
    gradient: ["#fefce8", "#fef08a"],
  },
  khoi: {
    label: "Khói",
    icon: Activity,
    color: "#6b7280",
    unit: "ppm",
    min: 0,
    max: 100,
    normal: [0, 20],
    gradient: ["#f9fafb", "#e5e7eb"],
  },
};

const generateData = (type, count = 12) => {
  const config = SENSOR_CONFIG[type];
  return Array.from({ length: count }, (_, i) => ({
    time: `${String(i * 2).padStart(2, "0")}:00`,
    value: parseFloat(
      (
        Math.random() * (config.normal[1] - config.normal[0]) * 1.3 +
        config.normal[0]
      ).toFixed(1),
    ),
  }));
};

function SensorCard({ type, roomCode, value, isAlert, onClick, isSelected }) {
  const config = SENSOR_CONFIG[type];
  const Icon = config.icon;
  const percentage = Math.min(
    ((value - config.min) / (config.max - config.min)) * 100,
    100,
  );

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg border-2 ${
        isSelected ? "shadow-lg" : "shadow-sm"
      }`}
      style={{
        background: isAlert
          ? `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`
          : "white",
        borderColor: isSelected
          ? config.color
          : isAlert
            ? config.color + "50"
            : "#f1f5f9",
        boxShadow: isSelected ? `0 8px 25px ${config.color}30` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: config.color + "18" }}
          >
            <Icon size={17} style={{ color: config.color }} />
          </div>
          <div>
            <p className="text-xs font-black text-gray-700">{config.label}</p>
            <p className="text-xs text-gray-400">{roomCode}</p>
          </div>
        </div>
        {isAlert && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
            style={{ background: config.color, color: "white" }}
          >
            <AlertTriangle size={10} />
            Cảnh báo
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-1 mb-3">
        <p className="text-3xl font-black" style={{ color: config.color }}>
          {value}
        </p>
        <p className="text-sm text-gray-400 mb-1 font-medium">{config.unit}</p>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              background: isAlert
                ? `linear-gradient(90deg, ${config.color}, ${config.color}aa)`
                : `linear-gradient(90deg, ${config.color}88, ${config.color})`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-300 font-medium">
          <span>
            {config.min}
            {config.unit}
          </span>
          <span className="text-gray-400">
            Ngưỡng: {config.normal[0]}-{config.normal[1]}
            {config.unit}
          </span>
          <span>
            {config.max}
            {config.unit}
          </span>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 text-xs">
        <p className="font-black text-gray-700 mb-1">{label}</p>
        <p className="font-bold" style={{ color: payload[0]?.color }}>
          {payload[0]?.value} {payload[0]?.name}
        </p>
      </div>
    );
  }
  return null;
};

export default function Sensors() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedSensor, setSelectedSensor] = useState("nhiet_do");
  const [sensorData, setSensorData] = useState({});
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        generateSensorData();
        setLastUpdate(new Date());
      }, 3000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, selectedRoom]);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
      if (res.data.length > 0) setSelectedRoom(res.data[0]);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const generateSensorData = () => {
    const newData = {};
    const newChart = {};
    Object.keys(SENSOR_CONFIG).forEach((type) => {
      const config = SENSOR_CONFIG[type];
      const value = parseFloat(
        (
          Math.random() * (config.normal[1] - config.normal[0]) * 1.2 +
          config.normal[0]
        ).toFixed(1),
      );
      newData[type] = {
        value,
        isAlert:
          value > config.normal[1] * 1.1 || value < config.normal[0] * 0.9,
      };
      newChart[type] = generateData(type);
    });
    setSensorData(newData);
    setChartData(newChart);
  };

  useEffect(() => {
    if (selectedRoom) generateSensorData();
  }, [selectedRoom]);

  const alerts = Object.entries(sensorData).filter(([_, d]) => d.isAlert);
  const selectedConfig = SENSOR_CONFIG[selectedSensor];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Cảm biến IoT</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Dữ liệu cảm biến mô phỏng theo thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div
              className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
            <span className="text-xs font-bold text-gray-500">
              {autoRefresh
                ? `Cập nhật: ${lastUpdate.toLocaleTimeString("vi-VN")}`
                : "Đã dừng"}
            </span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2"
            style={{
              background: autoRefresh ? "#fef2f2" : "#f0fdf4",
              color: autoRefresh ? "#ef4444" : "#22c55e",
              borderColor: autoRefresh ? "#fecaca" : "#bbf7d0",
            }}
          >
            <RefreshCw
              size={14}
              className={autoRefresh ? "animate-spin" : ""}
            />
            {autoRefresh ? "Dừng" : "Bắt đầu"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-sm font-black text-red-600">
              Cảnh báo cảm biến ({alerts.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {alerts.map(([type, data]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  background: SENSOR_CONFIG[type].color,
                  color: "white",
                }}
              >
                {SENSOR_CONFIG[type].label}: {data.value}
                {SENSOR_CONFIG[type].unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* LEFT: Room selector */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div
              className="px-4 py-3 border-b border-gray-100"
              style={{
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
              }}
            >
              <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Chọn phòng
              </p>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background:
                      selectedRoom?.id === room.id
                        ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                        : "transparent",
                    borderLeft:
                      selectedRoom?.id === room.id
                        ? "3px solid #1a56db"
                        : "3px solid transparent",
                  }}
                >
                  <p
                    className={`font-bold text-sm ${selectedRoom?.id === room.id ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {room.code}
                  </p>
                  <p className="text-xs text-gray-400">
                    {room.building_name} / T{room.floor_number}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Sensors */}
        <div className="col-span-10 space-y-5">
          {selectedRoom && (
            <>
              {/* Room info */}
              <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-blue-50">
                    📡
                  </div>
                  <div>
                    <p className="font-black text-gray-800">
                      Cảm biến phòng {selectedRoom.code}
                    </p>
                    <p className="text-xs text-gray-400">
                      {selectedRoom.building_name} / Tầng{" "}
                      {selectedRoom.floor_number} — {selectedRoom.capacity} chỗ
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Cập nhật lúc</p>
                  <p className="text-sm font-black text-gray-700 font-mono">
                    {lastUpdate.toLocaleTimeString("vi-VN")}
                  </p>
                </div>
              </div>

              {/* Sensor cards grid */}
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(SENSOR_CONFIG).map(([type, config]) => (
                  <SensorCard
                    key={type}
                    type={type}
                    roomCode={selectedRoom.code}
                    value={sensorData[type]?.value || config.normal[0]}
                    isAlert={sensorData[type]?.isAlert || false}
                    onClick={() => setSelectedSensor(type)}
                    isSelected={selectedSensor === type}
                  />
                ))}
              </div>

              {/* Chart area */}
              <div className="grid grid-cols-2 gap-4">
                {/* Main selected sensor chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: selectedConfig.color + "18" }}
                      >
                        <selectedConfig.icon
                          size={16}
                          style={{ color: selectedConfig.color }}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800">
                          {selectedConfig.label}
                        </p>
                        <p className="text-xs text-gray-400">
                          Theo thời gian ({selectedConfig.unit})
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-2xl font-black"
                      style={{ color: selectedConfig.color }}
                    >
                      {sensorData[selectedSensor]?.value ||
                        selectedConfig.normal[0]}
                      <span className="text-sm font-medium text-gray-400 ml-1">
                        {selectedConfig.unit}
                      </span>
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData[selectedSensor] || []}>
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name={selectedConfig.unit}
                        stroke={selectedConfig.color}
                        strokeWidth={2.5}
                        fill={selectedConfig.color + "18"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* All sensors mini charts */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <p className="text-sm font-black text-gray-800 mb-4">
                    Tổng quan tất cả cảm biến
                  </p>
                  <div className="space-y-3">
                    {Object.entries(SENSOR_CONFIG).map(([type, config]) => {
                      const val = sensorData[type]?.value || config.normal[0];
                      const pct = Math.min(
                        ((val - config.min) / (config.max - config.min)) * 100,
                        100,
                      );
                      const isAlert = sensorData[type]?.isAlert;
                      return (
                        <div
                          key={type}
                          className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition-all"
                          onClick={() => setSelectedSensor(type)}
                        >
                          <config.icon
                            size={14}
                            style={{ color: config.color }}
                            className="flex-shrink-0"
                          />
                          <span className="text-xs text-gray-500 w-20 font-medium">
                            {config.label}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: config.color,
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-black w-16 text-right"
                            style={{
                              color: isAlert ? config.color : "#6b7280",
                            }}
                          >
                            {val}
                            {config.unit}
                          </span>
                          {isAlert && (
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: config.color }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
