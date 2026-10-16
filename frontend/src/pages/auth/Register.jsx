import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  UsersRound,
} from "lucide-react";
import { Canvas } from "@react-three/fiber";
import api from "../../services/api";
import { LoginScene } from "./Login";

const initialForm = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  confirm_password: "",
  phone: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

function formatTime(date) {
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Mật khẩu cần có ít nhất 6 ký tự.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!acceptedTerms) {
      setError("Vui lòng đồng ý với điều khoản sử dụng.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(
        err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      id: "full_name",
      label: "Họ và tên",
      type: "text",
      autoComplete: "name",
      placeholder: "Nhập họ và tên của bạn",
      icon: UserRound,
    },
    {
      id: "username",
      label: "Tên đăng nhập",
      type: "text",
      autoComplete: "username",
      placeholder: "Nhập tên đăng nhập",
      icon: UsersRound,
    },
    {
      id: "email",
      label: "Email",
      type: "email",
      autoComplete: "email",
      placeholder: "email@campus.edu.vn",
      icon: Mail,
    },
    {
      id: "phone",
      label: "Số điện thoại",
      type: "tel",
      autoComplete: "tel",
      placeholder: "0901234567",
      icon: Phone,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7faff] lg:grid lg:grid-cols-[1.2fr_0.8fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#061632] text-white lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-10 lg:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 18% 18%, rgba(37,99,235,0.38), transparent 35%), radial-gradient(circle at 82% 78%, rgba(14,165,233,0.2), transparent 32%), linear-gradient(145deg, #061632 0%, #08265a 100%)",
          }}
        />
        <div className="relative z-10 w-full max-w-5xl">
          <div className="mb-3 flex items-center justify-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-300/30 bg-blue-500/15 text-3xl shadow-lg shadow-blue-950/40">
              🎓
            </span>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">
                Smart<span className="text-sky-400">Campus</span>
              </p>
              <p className="text-sm text-blue-200/70">
                Digital Twin Management System
              </p>
            </div>
          </div>

          <h1 className="mx-auto mt-5 max-w-2xl text-center text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Quản lý khuôn viên thông minh trong một không gian số
          </h1>

          <div className="mt-5 h-[min(52vh,500px)] min-h-[360px] overflow-hidden rounded-[28px] border border-blue-300/20 bg-slate-950/35 shadow-2xl shadow-blue-950/50">
            <Canvas
              camera={{ position: [0, 1.6, 8.5], fov: 43 }}
              shadows
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <LoginScene />
            </Canvas>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-300/20 bg-blue-950/45 px-5 py-4 backdrop-blur">
            <div>
              <p className="font-mono text-2xl font-semibold tracking-wider">
                {formatTime(time)}
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
            <div className="hidden items-center gap-3 text-right sm:flex">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
              <div>
                <p className="text-xs font-semibold text-blue-100">
                  Hệ thống đang hoạt động
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Tất cả dịch vụ vận hành ổn định
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8 sm:px-8 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-10 h-64 w-64 rounded-full border border-blue-100"
        />
        <div className="relative w-full max-w-2xl rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200 lg:hidden">
              🎓
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Đăng ký tài khoản
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Tạo tài khoản để sử dụng hệ thống SmartCampus
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map(({ id, label, icon: Icon, ...fieldProps }) => (
                <div key={id}>
                  <label htmlFor={id} className={labelClass}>
                    {label}
                  </label>
                  <div className="relative">
                    <Icon
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id={id}
                      {...fieldProps}
                      value={form[id]}
                      onChange={updateField(id)}
                      className={inputClass}
                      required={id !== "phone"}
                    />
                  </div>
                </div>
              ))}

              <div>
                <label htmlFor="password" className={labelClass}>
                  Mật khẩu
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={updateField("password")}
                    placeholder="Tối thiểu 6 ký tự"
                    className={`${inputClass} pr-12`}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm_password" className={labelClass}>
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={form.confirm_password}
                    onChange={updateField("confirm_password")}
                    placeholder="Nhập lại mật khẩu"
                    className={`${inputClass} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((visible) => !visible)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ẩn mật khẩu xác nhận"
                        : "Hiện mật khẩu xác nhận"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="role" className={labelClass}>
                Vai trò
              </label>
              <div className="relative">
                <UsersRound
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  id="role"
                  value="giang_vien"
                  disabled
                  className={`${inputClass} appearance-none disabled:cursor-not-allowed disabled:text-slate-600`}
                >
                  <option value="giang_vien">Giảng viên</option>
                </select>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Quản trị viên có thể thay đổi vai trò sau khi đăng ký.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                Tôi đồng ý với{" "}
                <span className="font-semibold text-blue-600">
                  điều khoản sử dụng
                </span>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang đăng ký..." : "Đăng ký"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">
            {" "}
            © 2026 SmartCampus Digital Twin | Developed by Nguyễn Công Vinh. All
            rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
