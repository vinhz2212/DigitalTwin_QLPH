import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import api from "../../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !token) return;
    if (password !== confirmPassword) {
      setError("Hai mật khẩu chưa trùng nhau.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
      window.history.replaceState(window.history.state, "", "/reset-password");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-sky-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-blue-100/70 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <LockKeyhole size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Đặt lại mật khẩu</h1>

        {success ? (
          <div className="mt-5 space-y-5">
            <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
              Mật khẩu đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.
            </p>
            <Link to="/login" className="block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700">
              Đến trang đăng nhập
            </Link>
          </div>
        ) : !token ? (
          <div className="mt-5 space-y-5">
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              Liên kết đặt lại mật khẩu không hợp lệ.
            </p>
            <Link to="/forgot-password" className="font-semibold text-blue-600 hover:underline">
              Yêu cầu liên kết mới
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-600">Nhập mật khẩu mới để hoàn tất.</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                Mật khẩu mới
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Nhập lại mật khẩu mới
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
              </button>
            </form>
            <Link to="/forgot-password" className="mt-5 inline-block text-sm font-medium text-blue-600 hover:underline">
              Liên kết hết hạn? Yêu cầu liên kết mới
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
