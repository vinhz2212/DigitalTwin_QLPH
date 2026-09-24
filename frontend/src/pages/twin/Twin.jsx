import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Thermometer,
  Bell,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Grid3x3,
} from "lucide-react";

const STATUS_COLORS = {
  trong: "#22c55e",
  dang_hoc: "#3b82f6",
  bao_tri: "#f59e0b",
  su_co: "#ef4444",
};

const STATUS_LABELS = {
  trong: "Đang trống",
  dang_hoc: "Đang học",
  bao_tri: "Bảo trì",
  su_co: "Sự cố",
};

// 🏠 Room 3D Component
function Room3D({ position, room, onClick, isSelected }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);
  const color = STATUS_COLORS[room.status] || "#9ca3af";

  useFrame(({ clock }) => {
    if (room.status === "su_co" && meshRef.current) {
      meshRef.current.material.emissiveIntensity =
        0.5 + Math.sin(clock.elapsedTime * 5) * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.material.opacity = isSelected
        ? 0.15 + Math.sin(clock.elapsedTime * 2) * 0.05
        : 0;
    }
  });

  return (
    <group position={position}>
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <boxGeometry args={[0.95, 0.5, 0.95]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0} />
      </mesh>

      {/* Main room body */}
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
        scale={hovered ? [1.06, 1.06, 1.06] : [1, 1, 1]}
      >
        <boxGeometry args={[0.84, 0.38, 0.84]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={
            room.status === "su_co" ? 0.5 : isSelected ? 0.4 : 0.1
          }
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>

      {/* Roof */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.86, 0.05, 0.86]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* Front windows */}
      <mesh position={[0, 0.04, 0.43]}>
        <boxGeometry args={[0.5, 0.16, 0.02]} />
        <meshStandardMaterial
          color="#bfdbfe"
          emissive="#93c5fd"
          emissiveIntensity={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Side windows */}
      <mesh position={[0.43, 0.04, 0]}>
        <boxGeometry args={[0.02, 0.16, 0.5]} />
        <meshStandardMaterial
          color="#bfdbfe"
          emissive="#93c5fd"
          emissiveIntensity={0.7}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[0.92, 0.46, 0.92]} />
          <meshStandardMaterial
            color="white"
            wireframe
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Room code label */}
      <Text
        position={[0, 0.28, 0]}
        fontSize={0.085}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.008}
        outlineColor="#00000066"
      >
        {room.code}
      </Text>
    </group>
  );
}

// 🏢 Floor Component
function Floor3D({
  floorNumber,
  rooms,
  buildingOffset,
  onRoomClick,
  selectedRoom,
  isHighlighted,
}) {
  const y = (floorNumber - 1) * 0.72;

  return (
    <group position={[buildingOffset, y, 0]}>
      {/* Floor slab */}
      <mesh position={[1.5, -0.23, 1.5]}>
        <boxGeometry args={[3.95, 0.07, 3.95]} />
        <meshStandardMaterial
          color={isHighlighted ? "#dbeafe" : "#e2e8f0"}
          transparent
          opacity={isHighlighted ? 0.8 : 0.4}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Floor edge glow when highlighted */}
      {isHighlighted && (
        <mesh position={[1.5, -0.19, 1.5]}>
          <boxGeometry args={[4.0, 0.02, 4.0]} />
          <meshStandardMaterial
            color="#3b82f6"
            emissive="#3b82f6"
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Floor number label */}
      <Text
        position={[-0.45, 0, 1.5]}
        fontSize={0.13}
        color={isHighlighted ? "#3b82f6" : "#94a3b8"}
        anchorX="center"
        rotation={[0, Math.PI / 2, 0]}
        fontWeight={isHighlighted ? "bold" : "normal"}
      >
        T{floorNumber}
      </Text>

      {/* Rooms */}
      {rooms.map((room, i) => (
        <Room3D
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

// 🏛️ Building Component
function Building3D({
  code,
  rooms,
  offset,
  onRoomClick,
  selectedRoom,
  highlightFloor,
}) {
  return (
    <group>
      {/* Building label */}
      <Text
        position={[offset + 1.5, 4.9, 1.5]}
        fontSize={0.28}
        color="#1a56db"
        fontWeight="bold"
        anchorX="center"
        outlineWidth={0.012}
        outlineColor="#ffffff88"
      >
        TÒA {code}
      </Text>

      {/* Building base */}
      <mesh position={[offset + 1.5, -0.58, 1.5]}>
        <boxGeometry args={[4.2, 0.12, 4.2]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.2} roughness={0.7} />
      </mesh>

      {/* Floors */}
      {[1, 2, 3, 4, 5].map((f) => (
        <Floor3D
          key={f}
          floorNumber={f}
          rooms={rooms.filter(
            (r) => r.building_code === code && r.floor_number === f,
          )}
          buildingOffset={offset}
          onRoomClick={onRoomClick}
          selectedRoom={selectedRoom}
          isHighlighted={highlightFloor === f}
        />
      ))}
    </group>
  );
}

// 🌍 Main Scene
function Scene({
  rooms,
  onRoomClick,
  selectedRoom,
  activeBuilding,
  activeFloor,
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.85}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-8, 10, -8]}
        intensity={0.25}
        color="#bfdbfe"
      />
      <pointLight position={[0, 10, 6]} intensity={0.5} color="#93c5fd" />
      <pointLight position={[-4, 6, -4]} intensity={0.3} color="#a5f3fc" />

      {/* Buildings */}
      <Building3D
        code="A"
        rooms={rooms}
        offset={-5.5}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        highlightFloor={activeBuilding === "A" ? activeFloor : null}
      />
      <Building3D
        code="B"
        rooms={rooms}
        offset={1.5}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        highlightFloor={activeBuilding === "B" ? activeFloor : null}
      />

      {/* Ground plane */}
      <mesh
        position={[-2, -0.65, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[26, 14]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* Grid */}
      <gridHelper
        args={[26, 26, "#e2e8f0", "#f1f5f9"]}
        position={[-2, -0.64, 2]}
      />

      {/* Road between buildings */}
      <mesh position={[-2, -0.63, 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 10]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={24}
        target={[-2, 2, 1.5]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

export default function Twin() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState(5);
  const [viewMode, setViewMode] = useState("3d");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
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

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div
            key={status}
            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
            onClick={() => navigate("/rooms")}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + "18" }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ background: color }}
              />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">
                {STATUS_LABELS[status]}
              </p>
              <p className="text-2xl font-black" style={{ color }}>
                {stats[status]}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* LEFT: Controls */}
        <div className="col-span-2 space-y-3">
          {/* Building selector */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Tòa nhà
            </p>
            <div className="space-y-2">
              {["A", "B"].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setSelectedBuilding(b);
                    setSelectedRoom(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background:
                      selectedBuilding === b
                        ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                        : "#f8fafc",
                    color: selectedBuilding === b ? "white" : "#64748b",
                    boxShadow:
                      selectedBuilding === b
                        ? "0 4px 15px rgba(26,86,219,0.35)"
                        : "none",
                    border:
                      selectedBuilding === b ? "none" : "1px solid #e2e8f0",
                  }}
                >
                  🏢 Tòa {b}
                </button>
              ))}
            </div>
          </div>

          {/* Floor selector */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Tầng
            </p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((f) => {
                const flRooms = rooms.filter(
                  (r) =>
                    r.building_code === selectedBuilding &&
                    r.floor_number === f,
                );
                const hasIncident = flRooms.some((r) => r.status === "su_co");
                const hasOccupied = flRooms.some(
                  (r) => r.status === "dang_hoc",
                );
                const isActive = selectedFloor === f;
                return (
                  <button
                    key={f}
                    onClick={() => {
                      setSelectedFloor(f);
                      setSelectedRoom(null);
                    }}
                    className="w-full py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between px-3"
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                        : "#f8fafc",
                      color: isActive ? "white" : "#374151",
                      boxShadow: isActive
                        ? "0 4px 12px rgba(26,86,219,0.3)"
                        : "none",
                      border: isActive ? "none" : "1px solid #e2e8f0",
                    }}
                  >
                    <span>Tầng {f}</span>
                    <div className="flex gap-1">
                      {hasIncident && (
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      )}
                      {hasOccupied && !hasIncident && (
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* View mode */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Chế độ xem
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: "3d", label: "3D" },
                { mode: "2d", label: "2D" },
              ].map(({ mode, label, icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="py-2 rounded-xl text-xs font-bold transition-all"
                  style={{
                    background:
                      viewMode === mode
                        ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                        : "#f8fafc",
                    color: viewMode === mode ? "white" : "#64748b",
                    border: viewMode === mode ? "none" : "1px solid #e2e8f0",
                    boxShadow:
                      viewMode === mode
                        ? "0 4px 12px rgba(26,86,219,0.3)"
                        : "none",
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: 3D View */}
        <div className="col-span-7">
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative"
            style={{ height: "520px" }}
          >
            {viewMode === "3d" ? (
              <Canvas camera={{ position: [7, 8, 13], fov: 46 }} shadows>
                <Scene
                  rooms={rooms}
                  onRoomClick={setSelectedRoom}
                  selectedRoom={selectedRoom}
                  activeBuilding={selectedBuilding}
                  activeFloor={selectedFloor}
                />
              </Canvas>
            ) : (
              /* 2D View */
              <div className="p-6 h-full overflow-auto bg-gray-50">
                <div className="flex gap-10 justify-center">
                  {["A", "B"].map((building) => (
                    <div key={building} className="flex-1 max-w-xs">
                      <div className="text-center mb-4">
                        <span
                          className="inline-block px-4 py-1.5 rounded-full text-sm font-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, #1a56db, #3b82f6)",
                          }}
                        >
                          🏢 Tòa {building}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((floor) => (
                          <div
                            key={floor}
                            className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
                          >
                            <p className="text-xs font-bold text-gray-400 mb-2">
                              Tầng {floor}
                            </p>
                            <div className="grid grid-cols-4 gap-1.5">
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
                                    className="h-10 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 shadow-sm"
                                    style={{
                                      background: STATUS_COLORS[room.status],
                                      outline:
                                        selectedRoom?.id === room.id
                                          ? "3px solid #1a56db"
                                          : "none",
                                      outlineOffset: "2px",
                                      boxShadow: `0 2px 8px ${STATUS_COLORS[room.status]}55`,
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
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 bg-white bg-opacity-95 px-5 py-2.5 rounded-full shadow-lg border border-gray-100 text-xs backdrop-blur-sm">
              {Object.entries(STATUS_COLORS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
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

        {/* RIGHT: Room detail */}
        <div className="col-span-3">
          <div
            className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col"
            style={{ height: "520px" }}
          >
            {/* Header */}
            <div
              className="px-4 py-3 border-b border-gray-100"
              style={{
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
              }}
            >
              <p className="text-xs font-black text-gray-600 uppercase tracking-widest">
                Tầng {selectedFloor} — Tòa {selectedBuilding}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {floorRooms.length} phòng học
              </p>
            </div>

            {/* Room list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {floorRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="p-3 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md"
                  style={{
                    borderColor:
                      selectedRoom?.id === room.id ? "#1a56db" : "#f1f5f9",
                    background:
                      selectedRoom?.id === room.id ? "#eff6ff" : "white",
                    boxShadow:
                      selectedRoom?.id === room.id
                        ? "0 4px 15px rgba(26,86,219,0.15)"
                        : "none",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-gray-800">
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
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {room.capacity} chỗ
                    </span>
                    <span className="flex items-center gap-1">
                      <Thermometer size={11} /> 25°C
                    </span>
                    <span className="flex items-center gap-1">
                      <Bell size={11} /> Tốt
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Room detail when selected */}
            {selectedRoom && (
              <div
                className="border-t border-gray-100 p-4"
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3">
                  Chi tiết phòng
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "Mã phòng", value: selectedRoom.code },
                    { label: "Tòa nhà", value: selectedRoom.building_name },
                    {
                      label: "Tầng",
                      value: `Tầng ${selectedRoom.floor_number}`,
                    },
                    {
                      label: "Sức chứa",
                      value: `${selectedRoom.capacity} chỗ`,
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-bold text-gray-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Quick status change */}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <button
                      key={status}
                      onClick={async () => {
                        try {
                          await api.patch(`/rooms/${selectedRoom.id}/status`, {
                            status,
                          });
                          setSelectedRoom({ ...selectedRoom, status });
                          fetchRooms();
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{
                        background:
                          status === selectedRoom.status ? color : color + "80",
                        boxShadow:
                          status === selectedRoom.status
                            ? `0 3px 10px ${color}55`
                            : "none",
                      }}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
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
    </div>
  );
}
