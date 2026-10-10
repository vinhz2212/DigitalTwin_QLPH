import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Edges,
  OrbitControls,
  RoundedBox,
  Text,
} from "@react-three/drei";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Thermometer,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import useSocket from "../../hooks/useSocket";

const STATUS_COLORS = {
  trong: "#22c55e",
  dang_hoc: "#3b82f6",
  bao_tri: "#f59e0b",
  su_co: "#ef4444",
};

const STATUS_SURFACE = {
  trong: "#e9f8ee",
  dang_hoc: "#eaf2ff",
  bao_tri: "#fff4df",
  su_co: "#ffeded",
};

const STATUS_LABELS = {
  trong: "Đang trống",
  dang_hoc: "Đang sử dụng",
  bao_tri: "Đang bảo trì",
  su_co: "Sự cố",
};

const INCIDENT_LABELS = {
  chay: "Cháy",
  mat_dien: "Mất điện",
  may_chieu_hong: "Máy chiếu hỏng",
  dieu_hoa_hong: "Điều hòa hỏng",
  mat_internet: "Mất Internet",
  qua_tai: "Quá tải",
};

const SEVERITY_LABELS = {
  thap: "Thấp",
  trung: "Trung bình",
  cao: "Cao",
  nghiem_trong: "Nghiêm trọng",
};

const FLOOR_HEIGHT = 0.86;

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

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.12, 0.72, 10]} />
        <meshStandardMaterial color="#806247" roughness={0.92} />
      </mesh>

      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.39, 16, 14]} />
        <meshStandardMaterial color="#67a875" roughness={0.9} />
      </mesh>

      <mesh position={[-0.22, 0.82, 0.08]} castShadow>
        <sphereGeometry args={[0.27, 14, 12]} />
        <meshStandardMaterial color="#82b987" roughness={0.9} />
      </mesh>

      <mesh position={[0.23, 0.83, -0.06]} castShadow>
        <sphereGeometry args={[0.28, 14, 12]} />
        <meshStandardMaterial color="#559767" roughness={0.9} />
      </mesh>
    </group>
  );
}

function RoomBox({ position, room, onClick, isSelected }) {
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef();

  const statusColor = STATUS_COLORS[room.status] || "#94a3b8";
  const surfaceColor = STATUS_SURFACE[room.status] || "#f1f5f9";

  useFrame(({ clock }) => {
    if (pulseRef.current && room.status === "su_co") {
      const pulse = 0.85 + Math.sin(clock.elapsedTime * 4) * 0.2;
      pulseRef.current.scale.setScalar(pulse);
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
      <RoundedBox
        args={[1.04, 0.62, 0.24]}
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
          color="#eef4f5"
          roughness={0.56}
          metalness={0.02}
          clearcoat={0.18}
        />
        {isSelected && <Edges color="#1768e8" threshold={15} />}
      </RoundedBox>

      <RoundedBox
        args={[0.88, 0.3, 0.025]}
        radius={0.018}
        smoothness={3}
        position={[0, 0.075, 0.132]}
      >
        <meshPhysicalMaterial
          color={surfaceColor}
          roughness={0.3}
          metalness={0.12}
          clearcoat={0.45}
        />
      </RoundedBox>

      <mesh position={[0, 0.075, 0.15]}>
        <boxGeometry args={[0.88, 0.018, 0.012]} />
        <meshStandardMaterial
          color="#315d70"
          metalness={0.28}
          roughness={0.34}
        />
      </mesh>

      <mesh position={[0, 0.075, 0.15]}>
        <boxGeometry args={[0.018, 0.3, 0.012]} />
        <meshStandardMaterial
          color="#315d70"
          metalness={0.28}
          roughness={0.34}
        />
      </mesh>

      <RoundedBox
        args={[0.67, 0.17, 0.025]}
        radius={0.025}
        smoothness={3}
        position={[0, -0.19, 0.143]}
      >
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
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

      <mesh position={[0, -0.285, 0.14]}>
        <boxGeometry args={[0.88, 0.045, 0.025]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={room.status === "su_co" ? statusColor : "#000000"}
          emissiveIntensity={room.status === "su_co" ? 0.45 : 0}
          roughness={0.35}
        />
      </mesh>

      <mesh ref={pulseRef} position={[0.39, 0.22, 0.15]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={room.status === "su_co" ? 1.2 : 0.15}
        />
      </mesh>

      {isSelected && (
        <RoundedBox
          args={[1.13, 0.7, 0.28]}
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

function FloorGroup({
  floorNumber,
  rooms,
  buildingOffset,
  onRoomClick,
  selectedRoom,
  isActive,
}) {
  const floorRooms = rooms.slice(0, 4);
  const floorY = (floorNumber - 1) * FLOOR_HEIGHT;

  return (
    <group position={[buildingOffset, floorY, 0]}>
      <mesh position={[2.5, -0.08, 1.55]} receiveShadow castShadow>
        <boxGeometry args={[5.18, 0.13, 3.35]} />
        <meshStandardMaterial
          color={isActive ? "#dcecff" : "#dce5e9"}
          roughness={0.62}
          metalness={0.06}
        />
      </mesh>

      <mesh position={[2.5, -0.045, 3.24]}>
        <boxGeometry args={[5.06, 0.045, 0.045]} />
        <meshStandardMaterial
          color={isActive ? "#2878ed" : "#a9c1cc"}
          emissive={isActive ? "#2878ed" : "#000000"}
          emissiveIntensity={isActive ? 0.2 : 0}
        />
      </mesh>

      <mesh position={[2.5, 0.76, 3.16]} castShadow>
        <boxGeometry args={[5.04, 0.075, 0.12]} />
        <meshStandardMaterial color="#376c80" metalness={0.2} roughness={0.38} />
      </mesh>

      {[1.135, 2.285, 3.435].map((x) => (
        <mesh key={`mullion-${floorNumber}-${x}`} position={[x, 0.38, 3.14]}>
          <boxGeometry args={[0.045, 0.61, 0.085]} />
          <meshStandardMaterial color="#7798a4" metalness={0.2} roughness={0.4} />
        </mesh>
      ))}

      {floorRooms.map((room, index) => (
        <RoomBox
          key={room.id}
          position={[0.56 + index * 1.15, 0.38, 2.98]}
          room={room}
          onClick={onRoomClick}
          isSelected={selectedRoom?.id === room.id}
        />
      ))}

      <RoundedBox
        args={[0.38, 0.34, 0.13]}
        radius={0.045}
        smoothness={3}
        position={[-0.25, 0.38, 2.98]}
      >
        <meshStandardMaterial
          color={isActive ? "#1768e8" : "#edf3f6"}
          roughness={0.45}
        />
      </RoundedBox>

      <Text
        position={[-0.25, 0.38, 3.06]}
        fontSize={0.11}
        color={isActive ? "white" : "#587080"}
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
  activeFloor,
}) {
  const isInnerSide = (side) =>
    (code === "A" && side === 1) || (code === "B" && side === -1);

  return (
    <group>
      <mesh position={[offset + 2.5, 2.1, 0.12]} receiveShadow>
        <boxGeometry args={[4.95, 4.25, 0.16]} />
        <meshStandardMaterial
          color="#dce6e8"
          roughness={0.76}
          metalness={0.02}
        />
      </mesh>

      {[-1, 1].flatMap((side) => {
        const x = side < 0 ? offset + 0.02 : offset + 4.98;
        const innerSide = isInnerSide(side);

        if (!innerSide) {
          return [
            <mesh key={`side-wall-${code}-${side}`} position={[x, 2.1, 1.62]} receiveShadow>
              <boxGeometry args={[0.16, 4.25, 3.12]} />
              <meshStandardMaterial color="#d4e1e4" roughness={0.7} />
            </mesh>,
          ];
        }

        const wallMaterial = <meshStandardMaterial color="#d4e1e4" roughness={0.7} />;
        return [
          <mesh key={`inner-wall-low-${code}`} position={[x, 0.0275, 1.62]} receiveShadow>
            <boxGeometry args={[0.16, 0.105, 3.12]} />
            {wallMaterial}
          </mesh>,
          <mesh key={`inner-wall-left-${code}`} position={[x, 0.405, 0.63]} receiveShadow>
            <boxGeometry args={[0.16, 0.86, 1.14]} />
            {wallMaterial}
          </mesh>,
          <mesh key={`inner-wall-right-${code}`} position={[x, 0.405, 2.55]} receiveShadow>
            <boxGeometry args={[0.16, 0.86, 1.26]} />
            {wallMaterial}
          </mesh>,
          <mesh key={`inner-wall-high-${code}`} position={[x, 0.7675, 1.56]} receiveShadow>
            <boxGeometry args={[0.16, 0.135, 0.72]} />
            {wallMaterial}
          </mesh>,
          <mesh key={`inner-wall-upper-${code}`} position={[x, 2.53, 1.62]} receiveShadow>
            <boxGeometry args={[0.16, 3.39, 3.12]} />
            {wallMaterial}
          </mesh>,
        ];
      })}

      {[-1, 1].flatMap((side) =>
        [1, 2, 3, 4, 5].flatMap((floorNumber) => {
          const innerOpeningSide = isInnerSide(side) && floorNumber === 1;
          const windowZs = innerOpeningSide
            ? [0.4, 0.89, 2.27, 2.84]
            : [0.48, 1.2, 1.92, 2.64];
          const frameWidth = innerOpeningSide ? 0.42 : 0.57;
          const paneWidth = innerOpeningSide ? 0.32 : 0.47;
          const sideX = side < 0 ? offset - 0.075 : offset + 5.075;
          const glassX = side < 0 ? offset - 0.103 : offset + 5.103;
          const y = (floorNumber - 1) * FLOOR_HEIGHT + 0.4;

          return windowZs.map((z, index) => (
            <group key={`side-window-${code}-${side}-${floorNumber}-${index}`}>
              <mesh position={[sideX, y, z]} castShadow>
                <boxGeometry args={[0.045, 0.53, frameWidth]} />
                <meshStandardMaterial color="#315d70" metalness={0.24} roughness={0.4} />
              </mesh>
              <mesh position={[glassX, y, z]}>
                <boxGeometry args={[0.018, 0.43, paneWidth]} />
                <meshPhysicalMaterial
                  color="#75b5c7"
                  roughness={0.2}
                  metalness={0.28}
                  clearcoat={0.85}
                  clearcoatRoughness={0.16}
                />
              </mesh>
            </group>
          ));
        }),
      )}

      {[0.03, 4.97].map((x) => (
        <RoundedBox
          key={`front-column-${x}`}
          args={[0.14, 4.34, 0.18]}
          radius={0.035}
          smoothness={3}
          position={[offset + x, 2.1, 3.18]}
          castShadow
        >
          <meshStandardMaterial
          color="#f4f6f3"
          metalness={0.04}
          roughness={0.52}
          />
        </RoundedBox>
      ))}

      <mesh position={[offset + 2.5, -0.16, 1.55]} castShadow receiveShadow>
        <boxGeometry args={[5.32, 0.24, 3.52]} />
        <meshStandardMaterial color="#849da5" roughness={0.68} />
      </mesh>

      <RoundedBox
        args={[5.26, 0.2, 3.5]}
        radius={0.06}
        smoothness={4}
        position={[offset + 2.5, 4.28, 1.55]}
        castShadow
      >
        <meshStandardMaterial
          color="#e8eff0"
          metalness={0.04}
          roughness={0.5}
        />
      </RoundedBox>

      <mesh position={[offset + 2.5, 4.4, 1.55]}>
        <boxGeometry args={[5.32, 0.055, 3.55]} />
        <meshStandardMaterial
          color="#17637d"
          metalness={0.28}
          roughness={0.34}
        />
      </mesh>

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
        <FloorGroup
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
          isActive={activeFloor === floorNumber}
        />
      ))}
    </group>
  );
}

function Skybridge() {
  const mullionPositions = [-1.18, -0.72, -0.26, 0.2, 0.66, 1.12];

  return (
    <group>
      <mesh position={[0, -0.205, 1.56]} castShadow receiveShadow>
        <boxGeometry args={[3.25, 0.17, 0.78]} />
        <meshStandardMaterial color="#849da5" roughness={0.68} />
      </mesh>
      <mesh position={[0, -0.045, 1.56]} castShadow receiveShadow>
        <boxGeometry args={[3.25, 0.15, 0.78]} />
        <meshStandardMaterial color="#e8eff0" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.09, 1.56]} castShadow receiveShadow>
        <boxGeometry args={[3.25, 0.12, 0.78]} />
        <meshStandardMaterial color="#647f87" roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.79, 1.56]} castShadow>
        <boxGeometry args={[3.25, 0.1, 0.84]} />
        <meshStandardMaterial color="#17445d" metalness={0.18} roughness={0.42} />
      </mesh>

      {[1.19, 1.93].map((z) => (
        <group key={`bridge-side-${z}`}>
          <mesh position={[0, 0.445, z]} receiveShadow>
            <boxGeometry args={[3.16, 0.59, 0.035]} />
            <meshPhysicalMaterial
              color="#78b9c8"
              transparent
              opacity={0.48}
              depthWrite={false}
              metalness={0.12}
              roughness={0.28}
              clearcoat={0.65}
            />
          </mesh>
          {mullionPositions.map((x) => (
            <mesh key={`bridge-post-${z}-${x}`} position={[x, 0.445, z]} castShadow>
              <boxGeometry args={[0.045, 0.59, 0.055]} />
              <meshStandardMaterial color="#315d70" metalness={0.2} roughness={0.4} />
            </mesh>
          ))}
        </group>
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
}) {
  return (
    <>
      <color attach="background" args={["#d7e8f0"]} />
      <fog attach="fog" args={["#d7e8f0", 24, 48]} />

      <hemisphereLight args={["#f5fbff", "#718777", 1.35]} />

      <directionalLight
        position={[7, 12, 9]}
        intensity={1.65}
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
        offset={-6.5}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        activeFloor={activeBuilding === "A" ? activeFloor : null}
      />

      <Building3D
        code="B"
        rooms={rooms}
        offset={1.5}
        onRoomClick={onRoomClick}
        selectedRoom={selectedRoom}
        activeFloor={activeBuilding === "B" ? activeFloor : null}
      />

      <Skybridge />

      <mesh
        position={[0, -0.29, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[36, 23]} />
        <meshStandardMaterial color="#b7d5b0" roughness={0.96} />
      </mesh>

      <mesh
        position={[0, -0.27, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[1.45, 12]} />
        <meshStandardMaterial color="#d8e0df" roughness={0.88} />
      </mesh>

      <mesh
        position={[0, -0.265, 4.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[13, 1.15]} />
        <meshStandardMaterial color="#e6ece8" roughness={0.9} />
      </mesh>

      <Tree position={[-7.2, -0.27, 3.95]} scale={1.05} />
      <Tree position={[-7.05, -0.27, -0.75]} scale={0.9} />
      <Tree position={[-1.25, -0.27, 4.25]} scale={0.82} />
      <Tree position={[1.25, -0.27, 4.25]} scale={0.82} />
      <Tree position={[7.05, -0.27, -0.75]} scale={0.9} />
      <Tree position={[7.2, -0.27, 3.95]} scale={1.05} />

      <ContactShadows
        position={[0, -0.275, 1.4]}
        opacity={0.28}
        scale={18}
        blur={2.5}
        far={5}
        resolution={256}
      />

      <OrbitControls
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

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState("A");
  const [selectedFloor, setSelectedFloor] = useState(5);
  const [viewMode, setViewMode] = useState("3d");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchAll = useCallback(async () => {
    try {
      const [roomsRes, devicesRes, incidentsRes] = await Promise.all([
        api.get("/rooms"),
        api.get("/devices"),
        api.get("/simulation/active"),
      ]);

      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
      setIncidents(Array.isArray(incidentsRes.data) ? incidentsRes.data : []);
    } catch (error) {
      console.error("Không thể tải dữ liệu tổng quan:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useSocket({
    incident_simulated: fetchAll,
    incident_resolved: fetchAll,
    incident_created: fetchAll,
    incident_updated: fetchAll,
    room_status_changed: fetchAll,
    device_status_changed: fetchAll,
  });

  const floorRooms = rooms.filter(
    (room) =>
      room.building_code === selectedBuilding &&
      Number(room.floor_number) === selectedFloor,
  );

  const roomStats = {
    total: rooms.length,
    trong: rooms.filter((room) => room.status === "trong").length,
    dang_hoc: rooms.filter((room) => room.status === "dang_hoc").length,
    bao_tri: rooms.filter((room) => room.status === "bao_tri").length,
    su_co: rooms.filter((room) => room.status === "su_co").length,
  };

  const deviceStats = {
    total: devices.length,
    hoat_dong: devices.filter((device) => device.status === "hoat_dong").length,
    tat: devices.filter((device) => device.status === "tat").length,
    hong: devices.filter((device) => device.status === "hong").length,
    dang_sua: devices.filter((device) => device.status === "dang_sua").length,
  };

  const pieData = [
    { name: "Đang trống", value: roomStats.trong, color: "#22c55e" },
    { name: "Đang sử dụng", value: roomStats.dang_hoc, color: "#3b82f6" },
    { name: "Đang bảo trì", value: roomStats.bao_tri, color: "#f59e0b" },
    { name: "Sự cố", value: roomStats.su_co, color: "#ef4444" },
  ];

  const handleRoomClick = (room) => {
    setSelectedRoom(room);

    if (room.building_code) {
      setSelectedBuilding(room.building_code);
    }

    if (room.floor_number != null) {
      setSelectedFloor(Number(room.floor_number));
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-12 gap-4">
        <aside className="col-span-2 space-y-3">
          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-bold text-gray-500">Chọn tòa nhà</p>

            <div className="flex gap-2">
              {["A", "B"].map((building) => (
                <button
                  key={building}
                  type="button"
                  onClick={() => {
                    setSelectedBuilding(building);
                    setSelectedRoom(null);
                  }}
                  className="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
                  style={{
                    background:
                      selectedBuilding === building ? "#1a56db" : "#f3f4f6",
                    color: selectedBuilding === building ? "white" : "#6b7280",
                    boxShadow:
                      selectedBuilding === building
                        ? "0 4px 12px rgba(26,86,219,0.24)"
                        : "none",
                  }}
                >
                  Tòa {building}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-2 text-xs font-bold text-gray-500">Chọn tầng</p>

            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((floor) => {
                const roomsOnFloor = rooms.filter(
                  (room) =>
                    room.building_code === selectedBuilding &&
                    Number(room.floor_number) === floor,
                );

                const hasIncident = roomsOnFloor.some(
                  (room) => room.status === "su_co",
                );

                return (
                  <button
                    key={floor}
                    type="button"
                    onClick={() => {
                      setSelectedFloor(floor);
                      setSelectedRoom(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-bold transition-all"
                    style={{
                      background:
                        selectedFloor === floor ? "#1a56db" : "#f8fafc",
                      color: selectedFloor === floor ? "white" : "#374151",
                      borderColor:
                        selectedFloor === floor ? "#1a56db" : "#e5e7eb",
                    }}
                  >
                    <span>Tầng {floor}</span>
                    {hasIncident && (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="col-span-7">
          <div
            className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
            style={{ height: 460 }}
          >
            <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-lg border border-gray-100 bg-white p-1 shadow-md">
              {["2D", "3D"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode.toLowerCase())}
                  className="rounded-md px-3 py-1 text-xs font-bold transition-all"
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
              <Canvas
                camera={{
                  position: [9, 7, 17],
                  fov: 38,
                  near: 0.1,
                  far: 100,
                }}
                shadows
        dpr={[1, 2]}
                gl={{ antialias: true, alpha: false }}
              >
                <Scene
                  rooms={rooms}
                  onRoomClick={handleRoomClick}
                  selectedRoom={selectedRoom}
                  activeBuilding={selectedBuilding}
                  activeFloor={selectedFloor}
                />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center overflow-auto p-6">
                <div className="flex gap-10">
                  {["A", "B"].map((building) => (
                    <div key={building}>
                      <h3 className="mb-4 text-center text-base font-bold text-blue-600">
                        Tòa {building}
                      </h3>

                      <div className="space-y-2">
                        {[5, 4, 3, 2, 1].map((floor) => (
                          <div
                            key={`${building}-${floor}`}
                            className="flex items-center gap-2"
                          >
                            <span className="w-6 text-xs font-medium text-gray-400">
                              T{floor}
                            </span>

                            <div className="flex gap-1">
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
                                    onClick={() => handleRoomClick(room)}
                                    className="h-9 w-14 rounded-lg text-xs font-bold text-white shadow-sm transition-transform hover:scale-105"
                                    style={{
                                      background:
                                        STATUS_COLORS[room.status] || "#94a3b8",
                                      outline:
                                        selectedRoom?.id === room.id
                                          ? "3px solid #1a56db"
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-4 rounded-full border border-gray-100 bg-white/95 px-4 py-2 text-xs shadow-md">
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="whitespace-nowrap font-medium text-gray-600">
                    {STATUS_LABELS[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="col-span-3">
          <div
            className="flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm"
            style={{ height: 460 }}
          >
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs font-bold text-gray-700">
                Danh sách phòng — Tầng {selectedFloor} (Tòa {selectedBuilding})
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {floorRooms.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {loading ? "Đang tải phòng..." : "Không có phòng ở tầng này"}
                </div>
              ) : (
                floorRooms.map((room) => {
                  const color = STATUS_COLORS[room.status] || "#94a3b8";

                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomClick(room)}
                      className="w-full rounded-xl border-2 p-3 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor:
                          selectedRoom?.id === room.id ? "#1a56db" : "#f3f4f6",
                        background:
                          selectedRoom?.id === room.id ? "#eff6ff" : "white",
                      }}
                    >
                      <span className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-gray-800">
                          {room.code}
                        </span>

                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{
                            color,
                            background: `${color}18`,
                          }}
                        >
                          {STATUS_LABELS[room.status] || "Chưa rõ"}
                        </span>
                      </span>

                      <span className="flex items-center gap-3 text-xs text-gray-500">
                        <span>👥 {room.capacity} chỗ</span>
                        <span>
                          <Thermometer className="mr-0.5 inline" size={12} />
                          25°C
                        </span>
                        <span>
                          <CheckCircle className="mr-0.5 inline" size={12} />
                          Tốt
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-gray-100 p-3">
              <button
                type="button"
                onClick={() => navigate("/rooms")}
                className="flex w-full items-center justify-center gap-1 rounded-xl border-2 border-blue-200 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-50"
              >
                Xem tất cả phòng <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold text-gray-600">
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
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5">
            {pieData.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.name}
                </span>
                <span className="font-bold" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold text-gray-600">Thiết bị</p>

          <div className="mt-2 space-y-3">
            {[
              {
                label: "Tổng thiết bị",
                value: deviceStats.total,
                color: "#1a56db",
                icon: "🖥️",
              },
              {
                label: "Hoạt động",
                value: deviceStats.hoat_dong,
                color: "#22c55e",
                icon: "✅",
              },
              {
                label: "Đã tắt",
                value: deviceStats.tat,
                color: "#6b7280",
                icon: "⭕",
              },
              {
                label: "Hỏng",
                value: deviceStats.hong,
                color: "#ef4444",
                icon: "❌",
              },
              {
                label: "Đang sửa",
                value: deviceStats.dang_sua,
                color: "#f59e0b",
                icon: "🔧",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 text-gray-500">
                  <span>{item.icon}</span>
                  {item.label}
                </span>
                <span className="font-bold" style={{ color: item.color }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">Nhiệt độ TB</p>
            <span className="text-xs italic text-gray-400">Mô phỏng</span>
          </div>

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

          <p className="mt-1 text-center text-2xl font-black text-blue-600">
            26.5°C
          </p>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600">Điện năng</p>
            <span className="text-xs italic text-gray-400">Mô phỏng</span>
          </div>

          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={energyData}>
              <XAxis dataKey="date" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="kwh" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <p className="mt-1 text-center text-2xl font-black text-green-600">
            <Zap className="mr-1 inline" size={18} />
            420 kWh
          </p>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-gray-600">Cảnh báo</p>
              <p className="mt-1 text-xs text-gray-400">
                {incidents.length} sự cố đang xảy ra
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/incidents")}
              className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          {loading ? (
            <div className="flex h-24 items-center justify-center text-xs text-gray-400">
              Đang tải sự cố...
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center text-gray-400">
              <CheckCircle size={28} className="mb-1 text-green-400" />
              <p className="text-xs">Không có cảnh báo</p>
            </div>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {incidents.slice(0, 5).map((incident) => {
                const severe = ["cao", "nghiem_trong"].includes(
                  incident.severity,
                );

                return (
                  <div
                    key={incident.id}
                    className="flex items-start gap-2 rounded-lg p-2"
                    style={{
                      background: severe ? "#fef2f2" : "#fffbeb",
                    }}
                  >
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: severe ? "#ef4444" : "#f59e0b" }}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-gray-700">
                        {INCIDENT_LABELS[incident.type] || incident.type}
                        {incident.room_code
                          ? ` — Phòng ${incident.room_code}`
                          : ""}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {incident.description ||
                          `Mức độ: ${
                            SEVERITY_LABELS[incident.severity] ||
                            incident.severity ||
                            "Chưa rõ"
                          }`}
                      </p>

                      <p className="text-xs text-gray-400">
                        {incident.occurred_at
                          ? new Date(incident.occurred_at).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
