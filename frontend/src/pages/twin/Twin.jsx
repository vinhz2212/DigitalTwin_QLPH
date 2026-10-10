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
          color="#eef4f5"
          roughness={0.56}
          metalness={0.02}
          clearcoat={0.18}
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
          roughness={0.3}
          metalness={0.12}
          clearcoat={0.45}
        />
      </RoundedBox>

      {/* Khung cửa kính */}
      <mesh position={[0, 0.085, 0.15]}>
        <boxGeometry args={[0.018, 0.29, 0.012]} />
        <meshStandardMaterial
          color="#315d70"
          metalness={0.28}
          roughness={0.34}
        />
      </mesh>

      <mesh position={[0, 0.085, 0.15]}>
        <boxGeometry args={[0.86, 0.018, 0.012]} />
        <meshStandardMaterial
          color="#315d70"
          metalness={0.28}
          roughness={0.34}
        />
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

      {/* Dầm mặt tiền tạo nhịp tầng và khung cửa sổ rõ hơn */}
      <mesh position={[2.5, 0.76, 3.16]} castShadow>
        <boxGeometry args={[5.04, 0.075, 0.12]} />
        <meshStandardMaterial
          color="#376c80"
          metalness={0.2}
          roughness={0.38}
        />
      </mesh>

      {[1.135, 2.285, 3.435].map((x) => (
        <mesh key={`mullion-${floorNumber}-${x}`} position={[x, 0.38, 3.14]}>
          <boxGeometry args={[0.045, 0.61, 0.085]} />
          <meshStandardMaterial
            color="#7798a4"
            metalness={0.2}
            roughness={0.4}
          />
        </mesh>
      ))}

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
  const isInnerSide = (side) =>
    (code === "A" && side === 1) || (code === "B" && side === -1);

  return (
    <group>
      {/* Tường sau sáng, giữ mô hình dạng cutaway để đọc được các phòng */}
      <mesh position={[offset + 2.5, 2.1, 0.12]} receiveShadow>
        <boxGeometry args={[4.95, 4.25, 0.16]} />
        <meshStandardMaterial
          color="#dce6e8"
          roughness={0.76}
          metalness={0.02}
        />
      </mesh>

      {/* Hai tường hông; chừa cửa nối hành lang ở tầng 1 giữa hai tòa */}
      {[-1, 1].flatMap((side) => {
        const x = side < 0 ? offset + 0.02 : offset + 4.98;
        const innerSide = isInnerSide(side);

        if (!innerSide) {
          return [
            <mesh
              key={`side-wall-${code}-${side}`}
              position={[x, 2.1, 1.62]}
              receiveShadow
            >
              <boxGeometry args={[0.16, 4.25, 3.12]} />
              <meshStandardMaterial color="#d4e1e4" roughness={0.7} />
            </mesh>,
          ];
        }

        const wallMaterial = (
          <meshStandardMaterial color="#d4e1e4" roughness={0.7} />
        );
        return [
          // Tầng 1: hai mảng hông và lanh tô/bậu cửa bao quanh ô cửa nối.
          <mesh
            key={`inner-wall-low-${code}`}
            position={[x, 0.0275, 1.62]}
            receiveShadow
          >
            <boxGeometry args={[0.16, 0.105, 3.12]} />
            {wallMaterial}
          </mesh>,
          <mesh
            key={`inner-wall-left-${code}`}
            position={[x, 0.405, 0.63]}
            receiveShadow
          >
            <boxGeometry args={[0.16, 0.86, 1.14]} />
            {wallMaterial}
          </mesh>,
          <mesh
            key={`inner-wall-right-${code}`}
            position={[x, 0.405, 2.55]}
            receiveShadow
          >
            <boxGeometry args={[0.16, 0.86, 1.26]} />
            {wallMaterial}
          </mesh>,
          <mesh
            key={`inner-wall-high-${code}`}
            position={[x, 0.7675, 1.56]}
            receiveShadow
          >
            <boxGeometry args={[0.16, 0.135, 0.72]} />
            {wallMaterial}
          </mesh>,
          // Các tầng trên giữ tường kín để mặt dựng ổn định.
          <mesh
            key={`inner-wall-upper-${code}`}
            position={[x, 2.53, 1.62]}
            receiveShadow
          >
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
                <meshStandardMaterial
                  color="#315d70"
                  metalness={0.24}
                  roughness={0.4}
                />
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
            color="#f4f6f3"
            metalness={0.04}
            roughness={0.52}
          />
        </RoundedBox>
      ))}

      {/* Bệ móng */}
      <mesh position={[offset + 2.5, -0.16, 1.55]} castShadow receiveShadow>
        <boxGeometry args={[5.32, 0.24, 3.52]} />
        <meshStandardMaterial color="#849da5" roughness={0.68} />
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

      {/* Bảng tên tòa nhà */}
      <RoundedBox
        args={[1.5, 0.32, 0.12]}
        radius={0.06}
        smoothness={4}
        position={[offset + 2.5, 4.68, 1.55]}
      >
        <meshStandardMaterial color="#17445d" roughness={0.38} />
      </RoundedBox>

      <Text
        position={[offset + 2.5, 4.68, 1.62]}
        fontSize={0.19}
        color="#f5fbfc"
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

function Skybridge() {
  const mullionPositions = [-1.18, -0.72, -0.26, 0.2, 0.66, 1.12];

  return (
    <group>
      {/* Sàn hành lang kéo dài và ăn nhẹ vào hai tòa để nối liền lối đi tầng 1 */}
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
        <meshStandardMaterial
          color="#17445d"
          metalness={0.18}
          roughness={0.42}
        />
      </mesh>

      {/* Vách kính bắt đầu trên sàn hành lang và kéo lên tới mái */}
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
            <mesh
              key={`bridge-post-${z}-${x}`}
              position={[x, 0.445, z]}
              castShadow
            >
              <boxGeometry args={[0.045, 0.59, 0.055]} />
              <meshStandardMaterial
                color="#315d70"
                metalness={0.2}
                roughness={0.4}
              />
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
      <color attach="background" args={["#d7e8f0"]} />
      <fog attach="fog" args={["#d7e8f0", 24, 48]} />

      <hemisphereLight args={["#f5fbff", "#718777", 1.35]} />

      <directionalLight
        position={[8, 11, 7]}
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

      <Skybridge />

      {/* Sân cỏ */}
      <mesh
        position={[0, -0.29, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[38, 24]} />
        <meshStandardMaterial color="#aabd9f" roughness={0.96} />
      </mesh>

      {/* Lối đi giữa hai tòa */}
      <mesh
        position={[0, -0.27, 1.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[1.7, 13]} />
        <meshStandardMaterial color="#cbd4d2" roughness={0.84} />
      </mesh>

      {/* Sân phía trước */}
      <mesh
        position={[0, -0.265, 4.35]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 1.4]} />
        <meshStandardMaterial color="#d8dfdc" roughness={0.86} />
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
        target={[0, 2.05, 1.4]}
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
                  position: [10, 8, 21],
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
