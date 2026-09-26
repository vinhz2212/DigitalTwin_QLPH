import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { Eye, EyeOff } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

function MiniBuilding({ position, color, floors = 5 }) {
  const groupRef = useRef();
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;
    }
  });
  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.6, 0]}>
          <boxGeometry args={[1.5, 0.5, 1.5]} />
          <meshStandardMaterial
            color={i === floors - 1 ? "#3b82f6" : color}
            emissive={color}
            emissiveIntensity={0.1}
            metalness={0.3}
            roughness={0.4}
          />
        </mesh>
      ))}
      <mesh position={[0, floors * 0.6, 0]}>
        <boxGeometry args={[1.6, 0.1, 1.6]} />
        <meshStandardMaterial
          color="#1a56db"
          emissive="#1a56db"
          emissiveIntensity={0.3}
        />
      </mesh>
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={`w${i}`} position={[0, i * 0.6 + 0.1, 0.76]}>
          <boxGeometry args={[1.0, 0.25, 0.05]} />
          <meshStandardMaterial
            color="#bfdbfe"
            emissive="#93c5fd"
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

function LoginScene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <pointLight position={[-3, 5, 3]} intensity={0.8} color="#3b82f6" />
      <pointLight position={[3, 5, -3]} intensity={0.6} color="#06b6d4" />
      <MiniBuilding position={[-2, -1.5, 0]} color="#1e40af" floors={5} />
      <Text
        position={[-2, 2, 0]}
        fontSize={0.3}
        color="#60a5fa"
        anchorX="center"
      >
        TÒA A
      </Text>
      <MiniBuilding position={[2, -1.5, 0]} color="#1e3a8a" floors={5} />
      <Text
        position={[2, 2, 0]}
        fontSize={0.3}
        color="#60a5fa"
        anchorX="center"
      >
        TÒA B
      </Text>
      <mesh position={[0, -1.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1e293b" transparent opacity={0.5} />
      </mesh>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.5}
      />
    </>
  );
}

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        username: form.username,
        password: form.password,
      });
      login(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Tên đăng nhập hoặc mật khẩu không đúng!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f4ff" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a56db 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-10"
              style={{
                width: `${120 + i * 80}px`,
                height: `${120 + i * 80}px`,
                border: "1px solid white",
                top: `${15 + i * 12}%`,
                left: `${5 + i * 10}%`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 w-full max-w-lg text-white flex flex-col items-center">
          {/* Logo + Name */}
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-4"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
              }}
            >
              🎓
            </div>
            <h1 className="text-3xl font-black tracking-tight">SmartCampus</h1>
            <p className="text-blue-300 text-sm mt-1">
              Digital Twin Management System
            </p>
          </div>

          {/* 3D Canvas */}
          <div
            className="w-full rounded-2xl overflow-hidden mb-8"
            style={{
              height: "320px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
              <LoginScene />
            </Canvas>
          </div>

          {/* Clock */}
          <div
            className="w-full p-4 rounded-2xl text-center"
            style={{
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            <p className="text-3xl font-mono font-bold tracking-widest">
              {time.toLocaleTimeString("vi-VN")}
            </p>
            <p className="text-sm text-blue-200 mt-1">
              {time.toLocaleDateString("vi-VN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100">
            {/* Logo + Title */}
            <div className="flex flex-col items-center text-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              >
                🎓
              </div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight">
                SmartCampus
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Digital Twin System
              </p>
              <div
                className="w-10 h-0.5 rounded-full mt-3"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">Đăng nhập</h2>
              <p className="text-sm text-gray-400 mt-1">
                Nhập thông tin tài khoản của bạn
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                  Tên đăng nhập
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  placeholder="Nhập tên đăng nhập"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm transition-all bg-gray-50 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Nhập mật khẩu"
                    className="w-full px-4 py-3 pr-11 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm transition-all bg-gray-50 focus:bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 accent-blue-600"
                  />
                  Ghi nhớ đăng nhập
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:underline font-semibold"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all mt-2"
                style={{
                  background: loading
                    ? "#93c5fd"
                    : "linear-gradient(135deg, #1a56db, #3b82f6)",
                  boxShadow: loading
                    ? "none"
                    : "0 8px 20px rgba(26,86,219,0.35)",
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Đang đăng nhập...
                  </span>
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm text-gray-400 mt-5">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-blue-600 font-bold hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            © 2026 SmartCampus Digital Twin | Developed by Nguyễn Công Vinh. All
            rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
