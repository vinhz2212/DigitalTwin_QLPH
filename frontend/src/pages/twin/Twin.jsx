import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Edges,
  OrbitControls,
  RoundedBox,
  Text,
} from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronRight,
  Grid3X3,
  Maximize2,
  RotateCcw,
  Thermometer,
  Users,
} from "lucide-react";

import api from "../../services/api";
import useSocket from "../../hooks/useSocket";

const STATUS_COLORS = {
  trong: "#22c55e",
  dang_hoc: "#3b82f6",
  bao_tri: "#f59e0b",
  su_co: "#ef4444",
};

const STATUS_SURFACES = {
  trong: "#e9f8ee",
  dang_hoc: "#eaf2ff",
  bao_tri: "#fff4df",
  su_co: "#ffeded",
};

const STATUS_LABELS = {
  trong: "Đang trống",
  dang_hoc: "Đang học",
  bao_tri: "Bảo trì",
  su_co: "Sự cố",
};

const FLOOR_HEIGHT = 0.86;

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 0.7, 10]} />
        <meshStandardMaterial color="#806247" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.38, 14, 12]} />
        <meshStandardMaterial color="#69a976" roughness={0.9} />
      </mesh>

      <mesh position={[-0.22, 0.81, 0.08]} castShadow>
        <sphereGeometry args={[0.26, 12, 10]} />
        <meshStandardMaterial color="#83b98a" roughness={0.9} />
      </mesh>

      <mesh position={[0.22, 0.82, -0.06]} castShadow>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshStandardMaterial color="#559567" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Room3D({ position, room, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false);
  const alertLightRef = useRef();

  const statusColor = STATUS_COLORS[room.status] || "#94a3b8";
  const surfaceColor = STATUS_SURFACES[room.status] || "#f1f5f9";

  useFrame(({ clock }) => {
    if (alertLightRef.current && room.status === "su_co") {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
      alertLightRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group
      position={position}
      scale={hovered ? 1.045 : 1}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Thân phòng */}
      <RoundedBox
        args={[1.03, 0.62, 0.24]}
        radius={0.045}
        smoothness={4}
        castShadow
        receiveShadow
        onClick={(event) => {
          event.stopPropagation();
          onClick(room);
        }}
      >
        <meshPhysicalMaterial
          color="#f9fcfe"
          roughness={0.42}
          metalness={0.04}
          clearcoat={0.32}
        />
        {isSelected && <Edges color="#1768e8" threshold={15} />}
      </RoundedBox>

      {/* Cửa kính mặt tiền */}
      <RoundedBox
        args={[0.86, 0.29, 0.025]}
        radius={0.018}
        smoothness={3}
        position={[0, 0.085, 0.132]}
      >
        <meshPhysicalMaterial
          color={surfaceColor}
          roughness={0.22}
          metalness={0.07}
          clearcoat={0.75}
        />
      </RoundedBox>

      {/* Khung cửa kính */}
      <mesh position={[0, 0.085, 0.15]}>
        <boxGeometry args={[0.018, 0.29, 0.012]} />
        <meshStandardMaterial color="#9bbac8" metalness={0.2} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0.085, 0.15]}>
        <boxGeometry args={[0.86, 0.018, 0.012]} />
        <meshStandardMaterial color="#9bbac8" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* Bảng mã phòng */}
      <RoundedBox
        args={[0.66, 0.17, 0.025]}
        radius={0.025}
        smoothness={3}
        position={[0, -0.19, 0.14]}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.48} />
      </RoundedBox>

      <Text
        position={[0, -0.19, 0.16]}
        fontSize={0.125}
        color="#263d50"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={0.002}
        outlineColor="#ffffff"
      >
        {room.code}
      </Text>

      {/* Thanh trạng thái */}
      <mesh position={[0, -0.285, 0.14]}>
        <boxGeometry args={[0.86, 0.045, 0.025]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={room.status === "su_co" ? statusColor : "#000000"}
          emissiveIntensity={room.status === "su_co" ? 0.45 : 0}
          roughness={0.38}
        />
      </mesh>

      {/* Đèn báo nhỏ ở góc phòng */}
      <mesh ref={alertLightRef} position={[0.39, 0.22, 0.15]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={room.status === "su_co" ? 1.1 : 0.12}
        />
      </mesh>

      {/* Viền chọn phòng */}
      {isSelected && (
        <RoundedBox
          args={[1.12, 0.71, 0.28]}
          radius={0.06}
          smoothness={3}
          position={[0, 0, 0.01]}
        >
          <meshBasicMaterial
            color="#1768e8"
            wireframe
            transparent
            opacity={0.28}
          />
        </RoundedBox>
      )}
    </group>
  );
}

function Floor3D({
  floorNumber,
  rooms,
  buildingOffset,
  onRoomClick,
  selectedRoom,
  isHighlighted,
}) {
  const floorRooms = rooms.slice(0, 4);

  return (
    <group position={[buildingOffset, (floorNumber - 1) * FLOOR_HEIGHT, 0]}>
      {/* Sàn tầng */}
      <mesh position={[2.5, -0.08, 1.55]} castShadow receiveShadow>
        <boxGeometry args={[5.18, 0.13, 3.35]} />
        <meshStandardMaterial
          color={isHighlighted ? "#dcecff" : "#dce5e9"}
          roughness={0.62}
          metalness={0.06}
        />
      </mesh>

      {/* Nẹp màu ở tầng đang chọn */}
      <mesh position={[2.5, -0.045, 3.24]}>
        <boxGeometry args={[5.05, 0.045, 0.045]} />
        <meshStandardMaterial
          color={isHighlighted ? "#2878ed" : "#a9c1cc"}
          emissive={isHighlighted ? "#2878ed" : "#000000"}
          emissiveIntensity={isHighlighted ? 0.2 : 0}
        />
      </mesh>

      {/* Bốn phòng xếp ngang như mặt đứng tòa nhà */}
      {floorRooms.map((room, index) => (
        <Room3D
          key={room.id}
          position={[0.56 + index * 1.15, 0.38, 2.98]}
          room={room}
          onClick={onRoomClick}
          isSelected={selectedRoom?.id === room.id}
        />
      ))}

      {/* Nhãn tầng bên cạnh tòa nhà */}
      <RoundedBox
        args={[0.38, 0.34, 0.13]}
        radius={0.045}
        smoothness={3}
        position={[-0.25, 0.38, 2.98]}
      >
        <meshStandardMaterial
          color={isHighlighted ? "#1768e8" : "#edf3f6"}
          roughness={0.45}
        />
      </RoundedBox>

      <Text
        position={[-0.25, 0.38, 3.06]}
        fontSize={0.11}
        color={isHighlighted ? "white" : "#587080"}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {floorNumber}F
      </Text>
    </group>
  );
}

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
      {/* Tường sau kính mờ */}
      <mesh position={[offset + 2.5, 2.1, 0.12]} receiveShadow>
        <boxGeometry args={[4.95, 4.25, 0.16]} />
        <meshStandardMaterial
          color="#d8e8ef"
          transparent
          opacity={0.42}
          depthWrite={false}
          roughness={0.38}
        />
      </mesh>

      {/* Mặt kính bên hông để tạo chiều sâu */}
      <mesh position={[offset + 4.98, 2.1, 1.62]} receiveShadow>
        <boxGeometry args={[0.16, 4.25, 3.12]} />
        <meshPhysicalMaterial
          color="#a7cddd"
          transparent
          opacity={0.38}
          depthWrite={false}
          roughness={0.28}
          metalness={0.08}
          clearcoat={0.5}
        />
      </mesh>

      {/* Cột mặt tiền */}
      {[0.03, 4.97].map((x) => (
        <RoundedBox
          key={`column-${x}`}
          args={[0.14, 4.34, 0.18]}
          radius={0.035}
          smoothness={3}
          position={[offset + x, 2.1, 3.18]}
          castShadow
        >
          <meshStandardMaterial
            color="#f7fafb"
            metalness={0.1}
            roughness={0.42}
          />
        </RoundedBox>
      ))}

      {/* Bệ móng */}
      <mesh position={[offset + 2.5, -0.16, 1.55]} castShadow receiveShadow>
        <boxGeometry args={[5.32, 0.24, 3.52]} />
        <meshStandardMaterial color="#a9bbc3" roughness={0.7} />
      </mesh>

      {/* Mái */}
      <RoundedBox
        args={[5.26, 0.2, 3.5]}
        radius={0.06}
        smoothness={4}
        position={[offset + 2.5, 4.28, 1.55]}
        castShadow
      >
        <meshStandardMaterial
          color="#f3f8fa"
          metalness={0.08}
          roughness={0.38}
        />
      </RoundedBox>

      <mesh position={[offset + 2.5, 4.4, 1.55]}>
        <boxGeometry args={[5.32, 0.055, 3.55]} />
        <meshStandardMaterial
          color="#4b9dcc"
          metalness={0.22}
          roughness={0.34}
        />
      </mesh>

      {/* Bảng tên tòa nhà */}
      <RoundedBox
        args={[1.4, 0.35, 0.12]}
        radius={0.06}
        smoothness={4}
        position={[offset + 2.5, 4.68, 1.55]}
      >
        <meshStandardMaterial color="#1768e8" roughness={0.4} />
      </RoundedBox>

      <Text
        position={[offset + 2.5, 4.68, 1.62]}
        fontSize={0.19}
        color="white"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {`TÒA ${code}`}
      </Text>

      {[1, 2, 3, 4, 5].map((floorNumber) => (
        <Floor3D
          key={floorNumber}
          floorNumber={floorNumber}
          rooms={rooms.filter(
            (room) =>
              room.building_code === code &&
              Number(room.floor_number) === floorNumber,
          )}
          buildingOffset={offset}
          onRoomClick={onRoomClick}
          selectedRoom={selectedRoom}
          isHighlighted={highlightFloor === floorNumber}
        />
      ))}
    </group>
  );
}

function Scene({
  rooms,
  onRoomClick,
  selectedRoom,
  activeBuilding,
  activeFloor,
  resetSignal,
}) {
  const controlsRef = useRef();

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [resetSignal]);

  return (
    <>
      <color attach="background" args={["#dcecf7"]} />

      <hemisphereLight args={["#f5fbff", "#829b80", 1.2]} />

      <directionalLight
        position={[7, 12, 9]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={12}
        shadow-camera-bottom={-10}
      />

      <directionalLight
        position={[-8, 7, -5]}
        intensity={0.55}
        color="#c5e5ff"
      />

      <Building3D
        code="A"
        rooms={rooms}
        offset={-5.8}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        highlightFloor={activeBuilding === "A" ? activeFloor : null}
      />

      <Building3D
        code="B"
        rooms={rooms}
        offset={0.8}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        highlightFloor={activeBuilding === "B" ? activeFloor : null}
      />

      {/* Sân cỏ */}
      <mesh
        position={[0, -0.29, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[36, 23]} />
        <meshStandardMaterial color="#b7d5b0" roughness={0.96} />
      </mesh>

      {/* Lối đi giữa hai tòa */}
      <mesh
        position={[0, -0.27, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[1.45, 12]} />
        <meshStandardMaterial color="#d8e0df" roughness={0.88} />
      </mesh>

      {/* Sân phía trước */}
      <mesh
        position={[0, -0.265, 4.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[13, 1.15]} />
        <meshStandardMaterial color="#e6ece8" roughness={0.9} />
      </mesh>

      <Tree position={[-6.45, -0.27, 3.95]} scale={1.05} />
      <Tree position={[-5.9, -0.27, -0.75]} scale={0.9} />
      <Tree position={[-1.25, -0.27, 4.25]} scale={0.82} />
      <Tree position={[1.25, -0.27, 4.25]} scale={0.82} />
      <Tree position={[5.9, -0.27, -0.75]} scale={0.9} />
      <Tree position={[6.45, -0.27, 3.95]} scale={1.05} />

      <ContactShadows
        position={[0, -0.275, 1.4]}
        opacity={0.28}
        scale={18}
        blur={2.5}
        far={5}
        resolution={256}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={12}
        maxDistance={23}
        target={[0, 2.1, 1.45]}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.15}
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
  const [resetSignal, setResetSignal] = useState(0);

  const navigate = useNavigate();

  const fetchRooms = useCallback(async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(response.data);
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();

    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useSocket({
    incident_simulated: fetchRooms,
    incident_resolved: fetchRooms,
    room_status_changed: fetchRooms,
  });

  const floorRooms = rooms.filter(
    (room) =>
      room.building_code === selectedBuilding &&
      Number(room.floor_number) === selectedFloor,
  );

  const stats = {
    total: rooms.length,
    trong: rooms.filter((room) => room.status === "trong").length,
    dang_hoc: rooms.filter((room) => room.status === "dang_hoc").length,
    bao_tri: rooms.filter((room) => room.status === "bao_tri").length,
    su_co: rooms.filter((room) => room.status === "su_co").length,
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);

    if (room.building_code) {
      setSelectedBuilding(room.building_code);
    }

    if (room.floor_number != null) {
      setSelectedFloor(Number(room.floor_number));
    }
  };

  const handleStatusChange = async (status) => {
    if (!selectedRoom) return;

    try {
      await api.patch(`/rooms/${selectedRoom.id}/status`, { status });
      setSelectedRoom((current) =>
        current ? { ...current, status } : current,
      );
      await fetchRooms();
    } catch (error) {
      console.error("Không thể cập nhật trạng thái phòng:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tóm tắt trạng thái */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <button
            key={status}
            type="button"
            onClick={() => navigate("/rooms")}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{ background: `${color}18` }}
            >
              <span
                className="h-4 w-4 rounded-full"
                style={{
                  background: color,
                  boxShadow: `0 0 0 5px ${color}20`,
                }}
              />
            </span>

            <span>
              <span className="block text-xs font-medium text-gray-400">
                {STATUS_LABELS[status]}
              </span>
              <span
                className="mt-0.5 block text-2xl font-black"
                style={{ color }}
              >
                {stats[status]}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Bản đồ khuôn viên */}
      <div className="grid grid-cols-12 gap-4">
        {/* Điều khiển bên trái */}
        <aside className="col-span-12 space-y-3 lg:col-span-2">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Grid3X3 size={15} className="text-blue-600" />
              <h2 className="text-sm font-bold text-gray-700">Tòa nhà</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {["A", "B"].map((building) => {
                const active = selectedBuilding === building;

                return (
                  <button
                    key={building}
                    type="button"
                    onClick={() => {
                      setSelectedBuilding(building);
                      setSelectedRoom(null);
                    }}
                    className="rounded-xl px-3 py-2.5 text-sm font-bold transition-all"
                    style={{
                      color: active ? "white" : "#5b6b7c",
                      background: active
                        ? "linear-gradient(135deg, #1768e8, #4f91f5)"
                        : "#f5f8fb",
                      boxShadow: active
                        ? "0 6px 16px rgba(23,104,232,.22)"
                        : "none",
                    }}
                  >
                    Tòa {building}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-xs font-black text-blue-600">
                {selectedFloor}
              </span>
              <h2 className="text-sm font-bold text-gray-700">Chọn tầng</h2>
            </div>

            <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-1">
              {[5, 4, 3, 2, 1].map((floor) => {
                const roomsOnFloor = rooms.filter(
                  (room) =>
                    room.building_code === selectedBuilding &&
                    Number(room.floor_number) === floor,
                );

                const hasIncident = roomsOnFloor.some(
                  (room) => room.status === "su_co",
                );

                const active = selectedFloor === floor;

                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => {
                      setSelectedFloor(floor);
                      setSelectedRoom(null);
                    }}
                    className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition-all"
                    style={{
                      color: active ? "white" : "#536477",
                      background: active ? "#2168ed" : "#f8fafc",
                      borderColor: active ? "#2168ed" : "#e8edf2",
                    }}
                  >
                    <span className="lg:hidden">{floor}</span>
                    <span className="hidden lg:inline">Tầng {floor}</span>
                    {hasIncident && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-gray-700">Góc nhìn</h2>

            <div className="grid grid-cols-2 gap-2">
              {[
                { mode: "3d", label: "3D" },
                { mode: "2d", label: "2D" },
              ].map(({ mode, label }) => {
                const active = viewMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className="rounded-xl px-3 py-2 text-sm font-bold transition-all"
                    style={{
                      color: active ? "white" : "#64748b",
                      background: active ? "#2168ed" : "#f5f8fb",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        {/* Khu vực mô hình */}
        <section className="col-span-12 lg:col-span-7">
          <div
            className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            style={{ height: 540 }}
          >
            {viewMode === "3d" ? (
              <Canvas
                camera={{
                  position: [9, 7, 17],
                  fov: 38,
                  near: 0.1,
                  far: 100,
                }}
                shadows
                dpr={[1, 1.75]}
                gl={{ antialias: true, alpha: false }}
              >
                <Scene
                  rooms={rooms}
                  onRoomClick={handleRoomSelect}
                  selectedRoom={selectedRoom}
                  activeBuilding={selectedBuilding}
                  activeFloor={selectedFloor}
                  resetSignal={resetSignal}
                />
              </Canvas>
            ) : (
              <div className="h-full overflow-auto bg-slate-50 p-5">
                <div className="grid gap-5 xl:grid-cols-2">
                  {["A", "B"].map((building) => (
                    <section
                      key={building}
                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">
                          Tòa {building}
                        </h3>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                          5 tầng
                        </span>
                      </div>

                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((floor) => (
                          <div
                            key={`${building}-${floor}`}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <p className="mb-2 text-xs font-bold text-gray-400">
                              Tầng {floor}
                            </p>

                            <div className="grid grid-cols-4 gap-2">
                              {rooms
                                .filter(
                                  (room) =>
                                    room.building_code === building &&
                                    Number(room.floor_number) === floor,
                                )
                                .map((room) => (
                                  <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => handleRoomSelect(room)}
                                    className="rounded-lg py-2 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
                                    style={{
                                      background:
                                        STATUS_COLORS[room.status] || "#94a3b8",
                                      outline:
                                        selectedRoom?.id === room.id
                                          ? "3px solid #1768e8"
                                          : "none",
                                      outlineOffset: 2,
                                    }}
                                  >
                                    {room.code}
                                  </button>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}

            {/* Điều khiển camera */}
            <div className="absolute left-3 top-3 z-10 flex gap-1.5 rounded-xl border border-white/70 bg-white/90 p-1.5 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={() => setResetSignal((value) => value + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Đặt lại góc nhìn"
              >
                <RotateCcw size={16} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === "3d" ? "2d" : "3d")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Đổi chế độ xem"
              >
                <Maximize2 size={16} />
              </button>
            </div>

            {/* Chú giải */}
            <div className="absolute bottom-3 left-1/2 z-10 flex max-w-[95%] -translate-x-1/2 gap-3 overflow-x-auto rounded-full border border-white/70 bg-white/95 px-4 py-2.5 text-xs shadow-lg backdrop-blur">
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="whitespace-nowrap font-medium text-gray-600">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
              ))}
            </div>

            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 backdrop-blur-sm">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 shadow">
                  Đang tải mô hình...
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Danh sách và chi tiết phòng */}
        <aside className="col-span-12 lg:col-span-3">
          <section
            className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
            style={{ height: 540 }}
          >
            <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-gray-700">
                    Danh sách phòng
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">
                    Tầng {selectedFloor} · Tòa {selectedBuilding}
                  </p>
                </div>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-sm">
                  {floorRooms.length} phòng
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {floorRooms.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
                  <Grid3X3 size={28} className="mb-2 opacity-40" />
                  <p className="text-sm font-semibold">
                    {loading ? "Đang tải phòng..." : "Chưa có phòng ở tầng này"}
                  </p>
                </div>
              ) : (
                floorRooms.map((room) => {
                  const color = STATUS_COLORS[room.status] || "#94a3b8";
                  const selected = selectedRoom?.id === room.id;

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomSelect(room)}
                      className="w-full rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{
                        borderColor: selected ? "#2168ed" : "#edf1f5",
                        background: selected ? "#f2f7ff" : "#ffffff",
                      }}
                    >
                      <span className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-gray-800">
                          {room.code}
                        </span>

                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                          style={{
                            color,
                            background: `${color}18`,
                          }}
                        >
                          {STATUS_LABELS[room.status] || "Chưa rõ"}
                        </span>
                      </span>

                      <span className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {room.capacity} chỗ
                        </span>
                        <span className="flex items-center gap-1">
                          <Thermometer size={12} />
                          25°C
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle size={12} />
                          Tốt
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {selectedRoom && (
              <div className="border-t border-gray-100 bg-slate-50/80 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Chi tiết phòng
                  </p>
                  <span
                    className="rounded-full px-2 py-1 text-[11px] font-bold"
                    style={{
                      color: STATUS_COLORS[selectedRoom.status],
                      background: `${STATUS_COLORS[selectedRoom.status]}18`,
                    }}
                  >
                    {STATUS_LABELS[selectedRoom.status]}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <span className="text-gray-400">Mã phòng</span>
                  <span className="text-right font-bold text-gray-700">
                    {selectedRoom.code}
                  </span>

                  <span className="text-gray-400">Tòa nhà</span>
                  <span className="text-right font-bold text-gray-700">
                    {selectedRoom.building_name || `Tòa ${selectedBuilding}`}
                  </span>

                  <span className="text-gray-400">Tầng</span>
                  <span className="text-right font-bold text-gray-700">
                    Tầng {selectedRoom.floor_number}
                  </span>

                  <span className="text-gray-400">Sức chứa</span>
                  <span className="text-right font-bold text-gray-700">
                    {selectedRoom.capacity} chỗ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(STATUS_COLORS).map(([status, color]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(status)}
                      className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-85"
                      style={{
                        background:
                          selectedRoom.status === status ? color : `${color}a8`,
                      }}
                    >
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 p-3">
              <button
                type="button"
                onClick={() => navigate("/rooms")}
                className="flex w-full items-center justify-center gap-1 rounded-xl border border-blue-200 py-2.5 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
              >
                Quản lý phòng học
                <ChevronRight size={14} />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
