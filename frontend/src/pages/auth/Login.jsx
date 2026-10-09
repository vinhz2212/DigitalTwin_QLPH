import { Suspense, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";

function MiniBuilding({ position, color, floors = 5 }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.28) * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: floors }).map((_, index) => (
        <group key={index} position={[0, index * 0.62, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.55, 0.54, 1.5]} />
            <meshStandardMaterial
              color={index === floors - 1 ? "#3b82f6" : color}
              roughness={0.46}
              metalness={0.18}
            />
          </mesh>

          <mesh position={[0, 0.03, 0.76]}>
            <boxGeometry args={[1.08, 0.27, 0.035]} />
            <meshStandardMaterial
              color="#bfdbfe"
              emissive="#60a5fa"
              emissiveIntensity={0.45}
              roughness={0.25}
            />
          </mesh>

          <mesh position={[0, -0.17, 0.78]}>
            <boxGeometry args={[1.18, 0.045, 0.08]} />
            <meshStandardMaterial color="#7dd3fc" metalness={0.35} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, floors * 0.62, 0]}>
        <boxGeometry args={[1.68, 0.12, 1.62]} />
        <meshStandardMaterial
          color="#60a5fa"
          emissive="#2563eb"
          emissiveIntensity={0.22}
          metalness={0.25}
        />
      </mesh>
    </group>
  );
}

function LoginScene() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 8, 5]} intensity={1.4} />
      <pointLight position={[-4, 3, 4]} intensity={1.1} color="#38bdf8" />
      <pointLight position={[4, 2, -3]} intensity={0.8} color="#6366f1" />

      <MiniBuilding position={[-2, -1.55, 0]} color="#1e40af" floors={5} />
      <MiniBuilding position={[2, -1.55, 0]} color="#1e3a8a" floors={5} />

      <Suspense fallback={null}>
        <Text
          position={[-2, 2.05, 0.82]}
          fontSize={0.25}
          color="#bfdbfe"
          anchorX="center"
          anchorY="middle"
        >
          TOA A
        </Text>
        <Text
          position={[2, 2.05, 0.82]}
          fontSize={0.25}
          color="#bfdbfe"
          anchorX="center"
          anchorY="middle"
        >
          TOA B
        </Text>
      </Suspense>

      <mesh position={[0, -1.92, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 64]} />
        <meshStandardMaterial
          color="#172554"
          roughness={0.82}
          metalness={0.1}
        />
      </mesh>

      <gridHelper
        args={[10, 20, "#2563eb", "#1e3a8a"]}
        position={[0, -1.9, 0]}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.55}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2.25}
      />
    </>
  );
}

function getTimeForDisplay(date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const username = form.username.trim();
    if (!username || !form.password || loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        username,
        password: form.password,
      });

      login(response.data.user, response.data.token);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Tên đăng nhập hoặc mật khẩu không đúng.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      {/* Khu vực giới thiệu và mô hình 3D */}
      <section className="relative hidden min-h-screen overflow-hidden bg-slate-950 text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-10 lg:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.3), transparent 34%), radial-gradient(circle at 85% 75%, rgba(14,165,233,0.2), transparent 32%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full border border-blue-300/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-[29%] h-56 w-56 rounded-full border border-blue-300/10"
        />

        <div className="relative z-10 w-full max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl">
              🎓
            </span>
            <div>
              <p className="text-xl font-bold tracking-tight">SmartCampus</p>
              <p className="text-xs text-blue-200/70">
                Digital Twin Management System
              </p>
            </div>
          </div>

          <h1 className="mt-8 max-w-xl text-3xl font-semibold leading-tight xl:text-4xl">
            Quản lý khuôn viên trường học trong một không gian số.
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
            Theo dõi phòng học, thiết bị và sự cố qua hệ thống SmartCampus.
          </p>

          <div className="mt-5 h-[min(46vh,420px)] min-h-[280px] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 shadow-2xl shadow-blue-950/40">
            <Canvas
              camera={{ position: [0, 1.6, 8.5], fov: 43 }}
              dpr={[1, 1.5]}
              gl={{ antialias: true, alpha: true }}
            >
              <LoginScene />
            </Canvas>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
            <div>
              <p className="font-mono text-2xl font-semibold tracking-wider">
                {getTimeForDisplay(time)}
              </p>
              <p className="mt-1 text-sm capitalize text-blue-100/70">
                {time.toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-blue-100">
                SMART CAMPUS
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Không gian học tập thông minh
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Khu vực đăng nhập */}
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200">
              🎓
            </span>
            <p className="mt-3 text-lg font-bold text-slate-900">SmartCampus</p>
            <p className="text-xs text-slate-500">Digital Twin System</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Đăng nhập
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Nhập thông tin tài khoản để tiếp tục vào hệ thống.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Tên đăng nhập
                </span>
                <span className="relative block">
                  <UserRound
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    autoComplete="username"
                    value={form.username}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        username: event.target.value,
                      }))
                    }
                    placeholder="Nhập tên đăng nhập"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Mật khẩu
                </span>
                <span className="relative block">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Nhập mật khẩu"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-10 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <button
                type="submit"
                disabled={loading || !form.username.trim() || !form.password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-500">
                Chưa có tài khoản?{" "}
                <Link
                  to="/register"
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            © 2026 SmartCampus Digital Twin | Developed by Nguyễn Công Vinh. All
            rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
