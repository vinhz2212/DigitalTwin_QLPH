import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import api from "../../services/api";

const initialForm = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  confirm_password: "",
  phone: "",
  role_id: 2,
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const updateField = (field) => (event) => {
    const value =
      field === "role_id" ? Number(event.target.value) : event.target.value;

    setForm((current) => ({ ...current, [field]: value }));

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

    setLoading(true);

    try {
      await api.post("/auth/register", {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        role_id: form.role_id,
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

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10";

  const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 sm:px-6">
      <section className="w-full max-w-xl">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-3xl shadow-lg shadow-blue-600/25">
            🎓
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            SmartCampus
          </h1>
          <p className="mt-1 text-sm text-slate-500">Digital Twin System</p>
        </header>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Tạo tài khoản</h2>
            <p className="mt-2 text-sm text-slate-500">
              Điền thông tin bên dưới để đăng ký
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
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Họ và tên
                </label>
                <input
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={updateField("full_name")}
                  placeholder="Nguyễn Văn A"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className={labelClass}>
                  Tên đăng nhập
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={updateField("username")}
                  placeholder="nguyenvana"
                  className={inputClass}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField("email")}
                  placeholder="email@campus.edu.vn"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Số điện thoại
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={updateField("phone")}
                  placeholder="0901234567"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="role_id" className={labelClass}>
                  Vai trò
                </label>
                <select
                  id="role_id"
                  value={form.role_id}
                  onChange={updateField("role_id")}
                  className={inputClass}
                >
                  <option value={2}>Giảng viên</option>
                  <option value={3}>Kỹ thuật viên</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Mật khẩu
                </label>
                <div className="relative">
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang đăng ký..." : "Tạo tài khoản"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Đã có tài khoản?{" "}
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Đăng nhập
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          © 2026 SmartCampus Digital Twin | Developed by Nguyễn Công Vinh. All
          rights reserved.
        </p>
      </section>
    </main>
  );
}
