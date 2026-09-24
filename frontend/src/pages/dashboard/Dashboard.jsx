import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, RoundedBox } from "@react-three/drei";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Info, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_COLORS = {
  trong: "#22c55e",
  dang_hoc: "#3b82f6",
  bao_tri: "#f59e0b",
  su_co: "#ef4444",
};

const STATUS_LABELS = {
  trong: "Đang trống",
  dang_hoc: "Đang sử dụng",
  bao_tri: "Đang bảo trì",
  su_co: "Sự cố",
};

// 3D Room Box
function RoomBox({ position, room, onClick, isSelected }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLORS[room.status] || "#9ca3af";

  useFrame(({ clock }) => {
    if (meshRef.current && room.status === "su_co") {
      meshRef.current.material.emissiveIntensity =
        0.4 + Math.sin(clock.elapsedTime * 4) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Main box */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(room);
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        scale={hovered ? [1.08, 1.08, 1.08] : [1, 1, 1]}
      >
        <boxGeometry args={[0.82, 0.38, 0.82]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={
            room.status === "su_co" ? 0.4 : isSelected ? 0.35 : 0.08
          }
          metalness={0.15}
          roughness={0.45}
        />
      </mesh>

      {/* Top cap */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.84, 0.06, 0.84]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>

      {/* Windows front */}
      <mesh position={[0, 0.02, 0.42]}>
        <boxGeometry args={[0.55, 0.18, 0.02]} />
        <meshStandardMaterial
          color="#bfdbfe"
          emissive="#93c5fd"
          emissiveIntensity={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[0.9, 0.44, 0.9]} />
          <meshStandardMaterial
            color="white"
            wireframe
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Room label */}
      <Text
        position={[0, 0.27, 0]}
        fontSize={0.09}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.005}
        outlineColor="#00000055"
      >
        {room.code}
      </Text>
    </group>
  );
}

// 3D Floor
function FloorGroup({
  floorNumber,
  rooms,
  buildingOffset,
  onRoomClick,
  selectedRoom,
  isActive,
}) {
  const y = (floorNumber - 1) * 0.72;
  return (
    <group position={[buildingOffset, y, 0]}>
      {/* Floor slab */}
      <mesh position={[1.5, -0.24, 1.5]}>
        <boxGeometry args={[3.9, 0.06, 3.9]} />
        <meshStandardMaterial
          color={isActive ? "#dbeafe" : "#e5e7eb"}
          transparent
          opacity={isActive ? 0.7 : 0.35}
        />
      </mesh>
      {/* Floor label */}
      <Text
        position={[-0.4, 0, 1.5]}
        fontSize={0.13}
        color={isActive ? "#3b82f6" : "#9ca3af"}
        anchorX="center"
        rotation={[0, Math.PI / 2, 0]}
        fontWeight={isActive ? "bold" : "normal"}
      >
        T{floorNumber}
      </Text>
      {/* Rooms */}
      {rooms.map((room, i) => (
        <RoomBox
          key={room.id}
          position={[(i % 2) * 1.05 + 0.55, 0, Math.floor(i / 2) * 1.05 + 0.55]}
          room={room}
          onClick={onRoomClick}
          isSelected={selectedRoom?.id === room.id}
        />
      ))}
    </group>
  );
}

// 3D Building
function Building3D({
  code,
  rooms,
  offset,
  onRoomClick,
  selectedRoom,
  activeFloor,
}) {
  return (
    <group>
      {/* Building label */}
      <Text
        position={[offset + 1.5, 4.8, 1.5]}
        fontSize={0.32}
        color="#1a56db"
        fontWeight="bold"
        anchorX="center"
        outlineWidth={0.01}
        outlineColor="#ffffff55"
      >
        TÒA {code}
      </Text>
      {/* Floors */}
      {[1, 2, 3, 4, 5].map((f) => (
        <FloorGroup
          key={f}
          floorNumber={f}
          rooms={rooms.filter(
            (r) => r.building_code === code && r.floor_number === f,
          )}
          buildingOffset={offset}
          onRoomClick={onRoomClick}
          selectedRoom={selectedRoom}
          isActive={activeFloor === f}
        />
      ))}
    </group>
  );
}

// Main Scene
function Scene({
  rooms,
  onRoomClick,
  selectedRoom,
  activeBuilding,
  activeFloor,
}) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 12, 8]} intensity={0.9} castShadow />
      <directionalLight
        position={[-5, 8, -5]}
        intensity={0.3}
        color="#bfdbfe"
      />
      <pointLight position={[0, 8, 5]} intensity={0.4} color="#93c5fd" />

      <Building3D
        code="A"
        rooms={rooms}
        offset={-5.2}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        activeFloor={activeBuilding === "A" ? activeFloor : null}
      />
      <Building3D
        code="B"
        rooms={rooms}
        offset={1.2}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        activeFloor={activeBuilding === "B" ? activeFloor : null}
      />

      {/* Ground */}
      <mesh position={[-2, -0.52, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 12]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>

      {/* Grid lines */}
      <gridHelper
        args={[22, 22, "#cbd5e1", "#e2e8f0"]}
        position={[-2, -0.51, 2]}
      />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={22}
        target={[-2, 2, 1.5]}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// Sample data
const tempData = [
  { time: "00:00", temp: 24 },
  { time: "06:00", temp: 23 },
  { time: "12:00", temp: 26.5 },
  { time: "18:00", temp: 28 },
  { time: "24:00", temp: 25 },
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
const controls = [
  { label: "Điều hòa", icon: "🖥️", on: true },
  { label: "Chiếu sáng", icon: "💡", on: true },
  { label: "Quạt thông gió", icon: "🌀", on: true },
  { label: "Thiết bị điện", icon: "⚡", on: true },
  { label: "Camera", icon: "📷", on: true },
  { label: "Báo cháy", icon: "🔥", on: true, status: "Bình thường" },
  { label: "Cửa", icon: "🚪", on: true, status: "Mở" },
];

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState(5);
  const [viewMode, setViewMode] = useState("3d");
  const [loading, setLoading] = useState(true);
  const [controlStates, setControlStates] = useState(controls.map((c) => c.on));
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useSocket({
    incident_simulated: () => fetchRooms(),
    incident_resolved: () => fetchRooms(),
    room_status_changed: () => fetchRooms(),
    device_status_changed: () => fetchRooms(),
  });

  const floorRooms = rooms.filter(
    (r) =>
      r.building_code === selectedBuilding && r.floor_number === selectedFloor,
  );

  const stats = {
    total: rooms.length,
    trong: rooms.filter((r) => r.status === "trong").length,
    dang_hoc: rooms.filter((r) => r.status === "dang_hoc").length,
    bao_tri: rooms.filter((r) => r.status === "bao_tri").length,
    su_co: rooms.filter((r) => r.status === "su_co").length,
  };

  const pieData = [
    { name: "Đang trống", value: stats.trong, color: "#22c55e" },
    { name: "Đang sử dụng", value: stats.dang_hoc, color: "#3b82f6" },
    { name: "Đang bảo trì", value: stats.bao_tri, color: "#f59e0b" },
    { name: "Sự cố", value: stats.su_co, color: "#ef4444" },
  ];

  return (
    <div className="space-y-4 text-sm">
      {/* Top: 3 columns */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Building + Floor selector */}
        <div className="col-span-2 space-y-3">
          {/* Chọn tòa */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Chọn tòa nhà
            </p>
            <div className="flex gap-2">
              {["A", "B"].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setSelectedBuilding(b);
                    setSelectedRoom(null);
                  }}
                  className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{
                    background: selectedBuilding === b ? "#1a56db" : "#f3f4f6",
                    color: selectedBuilding === b ? "white" : "#6b7280",
                    boxShadow:
                      selectedBuilding === b
                        ? "0 4px 12px rgba(26,86,219,0.3)"
                        : "none",
                  }}
                >
                  🏢Tòa {b}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn tầng */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Chọn tầng
            </p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((f) => {
                const flRooms = rooms.filter(
                  (r) =>
                    r.building_code === selectedBuilding &&
                    r.floor_number === f,
                );
                const hasIncident = flRooms.some((r) => r.status === "su_co");
                return (
                  <button
                    key={f}
                    onClick={() => {
                      setSelectedFloor(f);
                      setSelectedRoom(null);
                    }}
                    className="w-full py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-between px-3"
                    style={{
                      background: selectedFloor === f ? "#1a56db" : "#f8fafc",
                      color: selectedFloor === f ? "white" : "#374151",
                      boxShadow:
                        selectedFloor === f
                          ? "0 4px 12px rgba(26,86,219,0.3)"
                          : "none",
                      border:
                        selectedFloor === f ? "none" : "1px solid #e5e7eb",
                    }}
                  >
                    <span>Tầng {f}</span>
                    {hasIncident && (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
              <button
                className="w-full py-2 rounded-lg text-sm font-medium transition-all px-3 text-gray-400"
                style={{ background: "#f8fafc", border: "1px solid #e5e7eb" }}
              >
                T (Trệt)
              </button>
            </div>
          </div>
        </div>

        {/* CENTER: 3D View */}
        <div className="col-span-7">
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative"
            style={{ height: "460px" }}
          >
            {/* Mode toggle */}
            <div className="absolute top-3 left-3 z-10 flex gap-1.5 bg-white rounded-lg p-1 shadow-md border border-gray-100">
              {["2D", "3D"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode.toLowerCase())}
                  className="px-3 py-1 rounded-md text-xs font-bold transition-all"
                  style={{
                    background:
                      viewMode === mode.toLowerCase()
                        ? "#1a56db"
                        : "transparent",
                    color:
                      viewMode === mode.toLowerCase() ? "white" : "#6b7280",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {viewMode === "3d" ? (
              <Canvas camera={{ position: [6, 7, 12], fov: 48 }} shadows>
                <Scene
                  rooms={rooms}
                  onRoomClick={setSelectedRoom}
                  selectedRoom={selectedRoom}
                  activeBuilding={selectedBuilding}
                  activeFloor={selectedFloor}
                />
              </Canvas>
            ) : (
              <div className="p-6 h-full overflow-auto flex items-center justify-center">
                <div className="flex gap-10">
                  {["A", "B"].map((building) => (
                    <div key={building}>
                      <h3 className="text-center font-bold text-blue-600 mb-4 text-base">
                        Tòa {building}
                      </h3>
                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((floor) => (
                          <div key={floor} className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-6 font-medium">
                              T{floor}
                            </span>
                            <div className="flex gap-1">
                              {rooms
                                .filter(
                                  (r) =>
                                    r.building_code === building &&
                                    r.floor_number === floor,
                                )
                                .map((room) => (
                                  <button
                                    key={room.id}
                                    onClick={() => setSelectedRoom(room)}
                                    className="w-14 h-9 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 shadow-sm"
                                    style={{
                                      background: STATUS_COLORS[room.status],
                                      outline:
                                        selectedRoom?.id === room.id
                                          ? "3px solid #1a56db"
                                          : "none",
                                      outlineOffset: "2px",
                                    }}
                                  >
                                    {room.code}
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-4 bg-white bg-opacity-95 px-4 py-2 rounded-full shadow-md border border-gray-100 text-xs">
              {Object.entries(STATUS_COLORS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: v }}
                  />
                  <span className="text-gray-600 font-medium">
                    {STATUS_LABELS[k]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Room list */}
        <div className="col-span-3">
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col"
            style={{ height: "460px" }}
          >
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Danh sách phòng — Tầng {selectedFloor} (Tòa {selectedBuilding})
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {floorRooms.length === 0 ? (
                <div className="text-center text-gray-300 py-8 text-xs">
                  Không có phòng
                </div>
              ) : (
                floorRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className="p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
                    style={{
                      borderColor:
                        selectedRoom?.id === room.id ? "#1a56db" : "#f3f4f6",
                      background:
                        selectedRoom?.id === room.id ? "#eff6ff" : "white",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-gray-800 text-sm">
                        {room.code}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: STATUS_COLORS[room.status],
                          background: STATUS_COLORS[room.status] + "18",
                        }}
                      >
                        {STATUS_LABELS[room.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>👥 {room.capacity} chỗ</span>
                      <span>🌡️ 25°C</span>
                      <span>✅ Tốt</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => navigate("/rooms")}
                className="w-full py-2 rounded-xl text-xs font-bold border-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"
              >
                Xem tất cả phòng <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE: Charts */}
      <div className="grid grid-cols-5 gap-4">
        {/* Tổng quan phòng */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
            Tổng quan phòng
          </p>
          <div className="flex justify-center">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={60}
                  dataKey="value"
                  strokeWidth={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-gray-500">{d.name}</span>
                </div>
                <span className="font-bold" style={{ color: d.color }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Thiết bị */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
            Thiết bị
          </p>
          <div className="space-y-3 mt-2">
            {[
              {
                label: "Tổng thiết bị",
                value: 240,
                color: "#1a56db",
                icon: "🖥️",
              },
              {
                label: "Hoạt động tốt",
                value: 198,
                color: "#22c55e",
                icon: "✅",
              },
              { label: "Cảnh báo", value: 28, color: "#f59e0b", icon: "⚠️" },
              { label: "Hỏng", value: 14, color: "#ef4444", icon: "❌" },
            ].map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span>{d.icon}</span>
                  <span className="text-gray-500">{d.label}</span>
                </div>
                <span className="font-bold" style={{ color: d.color }}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Nhiệt độ */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
            Nhiệt độ TB
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={tempData}>
              <XAxis dataKey="time" tick={{ fontSize: 9 }} />
              <YAxis domain={[20, 35]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="temp"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-center text-2xl font-black text-blue-600 mt-1">
            26.5°C
          </p>
        </div>

        {/* Điện năng */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
            Điện năng
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={energyData}>
              <XAxis dataKey="date" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="kwh" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-center text-2xl font-black text-green-600 mt-1">
            420 kWh
          </p>
        </div>

        {/* Cảnh báo */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
              Cảnh báo
            </p>
            <button
              onClick={() => navigate("/notifications")}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Xem tất cả
            </button>
          </div>
          <div className="space-y-2">
            {[
              {
                icon: AlertTriangle,
                color: "#ef4444",
                bg: "#fef2f2",
                title: "Máy chiếu B302 lỗi",
                time: "09:30",
              },
              {
                icon: AlertTriangle,
                color: "#f59e0b",
                bg: "#fffbeb",
                title: "Nhiệt độ cao A403",
                time: "09:10",
              },
              {
                icon: Info,
                color: "#3b82f6",
                bg: "#eff6ff",
                title: "Phòng B201 đã đặt",
                time: "08:45",
              },
            ].map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg"
                style={{ background: a.bg }}
              >
                <a.icon
                  size={12}
                  style={{ color: a.color }}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-400">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM: Controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wider">
          Điều khiển hệ thống tòa nhà
        </p>
        <div className="grid grid-cols-7 gap-3">
          {controls.map((c, i) => (
            <div
              key={i}
              className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-all"
            >
              <span className="text-2xl mb-1.5">{c.icon}</span>
              <p className="text-xs font-semibold text-gray-700 text-center mb-1">
                {c.label}
              </p>
              <p
                className="text-xs font-bold mb-2"
                style={{ color: controlStates[i] ? "#22c55e" : "#6b7280" }}
              >
                {c.status || (controlStates[i] ? "Bật" : "Tắt")}
              </p>
              <div
                className="w-10 h-5 rounded-full flex items-center px-0.5 cursor-pointer transition-all"
                style={{ background: controlStates[i] ? "#22c55e" : "#d1d5db" }}
                onClick={() => {
                  const s = [...controlStates];
                  s[i] = !s[i];
                  setControlStates(s);
                }}
              >
                <div
                  className="w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{
                    transform: controlStates[i]
                      ? "translateX(20px)"
                      : "translateX(0)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
