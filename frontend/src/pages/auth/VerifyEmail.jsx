import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MailCheck } from "lucide-react";
import api from "../../services/api";

export default function VerifyEmail() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    location.state?.sent ? "Mã xác minh đã được gửi. Vui lòng kiểm tra hộp thư." : "",
  );

  const handleVerify = async (event) => {
    event.preventDefault();
    if (verifying || !email.trim() || !/^\d{6}$/.test(code)) return;
    setVerifying(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/auth/verify-email", {
        email: email.trim(),
        code,
      });
      setVerified(true);
      setCode("");
      setMessage(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        "Không thể xác minh email lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (event) => {
    event.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post("/auth/resend-verification", {
        email: email.trim(),
      });
      setMessage(response.data.message);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        "Không thể gửi mã lúc này. Vui lòng thử lại sau.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-sky-100 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-blue-100/70 sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <MailCheck size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Xác minh email</h1>

        <>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {verified
                ? "Email của bạn đã được xác minh. Hãy đăng nhập để sử dụng SmartCampus."
                : "Nhập mã 6 chữ số đã gửi đến email. Mã có hiệu lực 10 phút."}
            </p>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p>}

            {!verified && (
              <div className="mt-7 space-y-4">
                <form onSubmit={handleVerify} className="space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Email đã đăng ký
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Nhập email đã đăng ký"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Mã xác minh
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Nhập mã 6 chữ số"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal tracking-widest outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={verifying || !email.trim() || code.length !== 6}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying ? "Đang xác minh..." : "Xác minh email"}
                </button>
                </form>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending || !email.trim()}
                  className="w-full rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Đang gửi..." : "Chưa nhận được mã? Gửi lại mã"}
                </button>
              </div>
            )}
            <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-blue-600 hover:underline">
              Quay lại đăng nhập
            </Link>
        </>
      </section>
    </main>
  );
}
