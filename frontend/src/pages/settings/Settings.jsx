import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  Save,
  User,
  Bell,
  Shield,
  Database,
  Palette,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Settings() {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    browser: true,
    incident: true,
    maintenance: true,
    booking: false,
    system: true,
  });

  const [appearance, setAppearance] = useState({
    language: "vi",
    timezone: "Asia/Ho_Chi_Minh",
    dateFormat: "DD/MM/YYYY",
    refreshInterval: 10,
    compactMode: false,
    showAnimations: true,
  });

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setProfile({
        full_name: res.data.full_name || "",
        email: res.data.email || "",
        phone: res.data.phone || "",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError("");
    try {
      await api.put("/users/profile", profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      setError(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwords.new !== passwords.confirm) {
      setPasswordError("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (passwords.new.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự!");
      return;
    }

    setLoading(true);
    try {
      await api.patch("/users/change-password", {
        current_password: passwords.current,
        new_password: passwords.new,
      });
      setPasswordSuccess("✅ Đổi mật khẩu thành công!");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      setPasswordError(
        error.response?.data?.message || "Mật khẩu hiện tại không đúng!",
      );
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "profile", icon: User, label: "Hồ sơ", color: "#1a56db" },
    { id: "notifications", icon: Bell, label: "Thông báo", color: "#f59e0b" },
    { id: "appearance", icon: Palette, label: "Giao diện", color: "#8b5cf6" },
    { id: "security", icon: Shield, label: "Bảo mật", color: "#ef4444" },
    { id: "system", icon: Database, label: "Hệ thống", color: "#22c55e" },
  ];

  const roleLabel =
    {
      admin: "Quản trị viên",
      giang_vien: "Giảng viên",
      ky_thuat_vien: "Kỹ thuật viên",
    }[user?.role] || user?.role;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Cài đặt</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Quản lý tài khoản và cấu hình hệ thống
        </p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-2">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center mb-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-3 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1a56db, #3b82f6)",
              }}
            >
              {user?.full_name?.charAt(0) || "A"}
            </div>
            <p className="font-black text-gray-800 text-sm">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{roleLabel}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Đang hoạt động
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-0.5 last:mb-0"
                style={{
                  background:
                    activeTab === tab.id ? tab.color + "12" : "transparent",
                  color: activeTab === tab.id ? tab.color : "#6b7280",
                  fontWeight: activeTab === tab.id ? "700" : "500",
                  borderLeft:
                    activeTab === tab.id
                      ? `3px solid ${tab.color}`
                      : "3px solid transparent",
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Tab header */}
          <div
            className="px-6 py-4 border-b border-gray-100"
            style={{ background: "linear-gradient(135deg, #f8fafc, #eff6ff)" }}
          >
            <div className="flex items-center gap-3">
              {(() => {
                const tab = tabs.find((t) => t.id === activeTab);
                return tab ? (
                  <>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: tab.color + "18" }}
                    >
                      <tab.icon size={18} style={{ color: tab.color }} />
                    </div>
                    <div>
                      <p className="font-black text-gray-800">{tab.label}</p>
                      <p className="text-xs text-gray-400">
                        Cấu hình {tab.label.toLowerCase()}
                      </p>
                    </div>
                  </>
                ) : null;
              })()}
            </div>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <div className="flex items-center gap-5 p-5 rounded-2xl border-2 border-gray-100 bg-gray-50">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                    }}
                  >
                    {profile.full_name?.charAt(0) || "A"}
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-lg">
                      {profile.full_name}
                    </p>
                    <p className="text-sm text-gray-400">{profile.email}</p>
                    <span
                      className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full"
                      style={{ background: "#eff6ff", color: "#1a56db" }}
                    >
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) =>
                        setProfile({ ...profile, email: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      placeholder="0901234567"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Vai trò
                    </label>
                    <div className="px-4 py-3 border-2 border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400">
                      {roleLabel} (không thể thay đổi)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="space-y-4">
                {[
                  {
                    key: "email",
                    label: "Thông báo qua Email",
                    desc: "Nhận thông báo vào hộp thư email",
                    icon: "📧",
                  },
                  {
                    key: "browser",
                    label: "Thông báo trình duyệt",
                    desc: "Hiển thị thông báo trên trình duyệt",
                    icon: "🌐",
                  },
                  {
                    key: "incident",
                    label: "Cảnh báo sự cố",
                    desc: "Thông báo ngay khi có sự cố xảy ra",
                    icon: "🚨",
                  },
                  {
                    key: "maintenance",
                    label: "Nhắc bảo trì",
                    desc: "Nhắc nhở lịch bảo trì thiết bị định kỳ",
                    icon: "🔧",
                  },
                  {
                    key: "booking",
                    label: "Đặt phòng",
                    desc: "Thông báo khi có yêu cầu đặt phòng mới",
                    icon: "📅",
                  },
                  {
                    key: "system",
                    label: "Hệ thống",
                    desc: "Thông báo cập nhật và khởi động hệ thống",
                    icon: "⚙️",
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 rounded-2xl border-2 transition-all"
                    style={{
                      borderColor: notifications[item.key]
                        ? "#bfdbfe"
                        : "#f1f5f9",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{
                          background: notifications[item.key]
                            ? "#eff6ff"
                            : "#f9fafb",
                        }}
                      >
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700">
                          {item.label}
                        </p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                    <div
                      className="w-12 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-300"
                      style={{
                        background: notifications[item.key]
                          ? "#1a56db"
                          : "#e5e7eb",
                      }}
                      onClick={() =>
                        setNotifications((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                    >
                      <div
                        className="w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                        style={{
                          transform: notifications[item.key]
                            ? "translateX(24px)"
                            : "translateX(0)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Ngôn ngữ",
                      key: "language",
                      options: [
                        { value: "vi", label: "🇻🇳 Tiếng Việt" },
                        { value: "en", label: "🇺🇸 English" },
                      ],
                    },
                    {
                      label: "Múi giờ",
                      key: "timezone",
                      options: [
                        {
                          value: "Asia/Ho_Chi_Minh",
                          label: "GMT+7 (Hồ Chí Minh)",
                        },
                      ],
                    },
                    {
                      label: "Định dạng ngày",
                      key: "dateFormat",
                      options: [
                        { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                        { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                      ],
                    },
                    {
                      label: "Tự động làm mới",
                      key: "refreshInterval",
                      options: [
                        { value: 5, label: "5 giây" },
                        { value: 10, label: "10 giây" },
                        { value: 30, label: "30 giây" },
                        { value: 60, label: "1 phút" },
                      ],
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">
                        {field.label}
                      </label>
                      <select
                        value={appearance[field.key]}
                        onChange={(e) =>
                          setAppearance({
                            ...appearance,
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {[
                    {
                      key: "compactMode",
                      label: "Chế độ thu gọn",
                      desc: "Giảm khoảng cách giữa các phần tử UI",
                      icon: "📐",
                    },
                    {
                      key: "showAnimations",
                      label: "Hiệu ứng động",
                      desc: "Bật/tắt các animation trong giao diện",
                      icon: "✨",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-50">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                            {item.label}
                          </p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <div
                        className="w-12 h-6 rounded-full flex items-center px-0.5 cursor-pointer transition-all duration-300"
                        style={{
                          background: appearance[item.key]
                            ? "#8b5cf6"
                            : "#e5e7eb",
                        }}
                        onClick={() =>
                          setAppearance((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key],
                          }))
                        }
                      >
                        <div
                          className="w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300"
                          style={{
                            transform: appearance[item.key]
                              ? "translateX(24px)"
                              : "translateX(0)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-200">
                  <p className="text-sm font-bold text-blue-700">
                    🔐 Đổi mật khẩu
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Đổi mật khẩu thường xuyên để bảo vệ tài khoản
                  </p>
                </div>

                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl text-sm">
                    {passwordSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {[
                    {
                      key: "current",
                      label: "Mật khẩu hiện tại",
                      placeholder: "Nhập mật khẩu hiện tại",
                    },
                    {
                      key: "new",
                      label: "Mật khẩu mới",
                      placeholder: "Tối thiểu 6 ký tự",
                    },
                    {
                      key: "confirm",
                      label: "Xác nhận mật khẩu mới",
                      placeholder: "Nhập lại mật khẩu mới",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">
                        {field.label}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword[field.key] ? "text" : "password"}
                          value={passwords[field.key]}
                          onChange={(e) =>
                            setPasswords((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className="w-full px-4 py-3 pr-11 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((prev) => ({
                              ...prev,
                              [field.key]: !prev[field.key],
                            }))
                          }
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword[field.key] ? (
                            <Eye size={16} />
                          ) : (
                            <EyeOff size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #f97316)",
                      boxShadow: "0 4px 15px rgba(239,68,68,0.35)",
                    }}
                  >
                    {loading ? "⏳ Đang xử lý..." : "🔑 Đổi mật khẩu"}
                  </button>
                </form>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Phiên bản hệ thống",
                      value: "v1.0.0",
                      icon: "🚀",
                    },
                    {
                      label: "Backend",
                      value: "Node.js + Express.js",
                      icon: "⚙️",
                    },
                    { label: "Database", value: "MySQL 8.0 CE", icon: "🗄️" },
                    { label: "Frontend", value: "React 18 + Vite", icon: "⚛️" },
                    { label: "Real-time", value: "Socket.IO v4", icon: "🔌" },
                    { label: "AI Engine", value: "Google Gemini", icon: "🤖" },
                    {
                      label: "3D Engine",
                      value: "React Three Fiber",
                      icon: "🎲",
                    },
                    { label: "Styling", value: "Tailwind CSS v3", icon: "🎨" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-100 hover:border-green-200 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gray-50">
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          {item.label}
                        </p>
                        <p className="text-sm font-black text-gray-700">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-2xl bg-green-50 border-2 border-green-200">
                  <p className="text-sm font-black text-green-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Hệ thống đang hoạt động bình thường
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Phòng học", value: "40", icon: "🏫" },
                      { label: "Thiết bị", value: "240", icon: "💡" },
                      { label: "Bảng DB", value: "17", icon: "🗄️" },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className="text-center p-3 bg-white rounded-xl border border-green-100"
                      >
                        <p className="text-xl">{s.icon}</p>
                        <p className="text-xl font-black text-green-700 mt-1">
                          {s.value}
                        </p>
                        <p className="text-xs text-green-500 font-medium">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            {(activeTab === "profile" ||
              activeTab === "notifications" ||
              activeTab === "appearance") && (
              <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {saved
                    ? "✅ Đã lưu thay đổi thành công!"
                    : error
                      ? `❌ ${error}`
                      : 'Nhấn "Lưu thay đổi" để áp dụng'}
                </p>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold transition-all"
                  style={{
                    background: saved
                      ? "linear-gradient(135deg, #22c55e, #16a34a)"
                      : "linear-gradient(135deg, #1a56db, #3b82f6)",
                    boxShadow: saved
                      ? "0 4px 15px rgba(34,197,94,0.35)"
                      : "0 4px 15px rgba(26,86,219,0.35)",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {saved ? <Check size={16} /> : <Save size={16} />}
                  {loading ? "Đang lưu..." : saved ? "Đã lưu!" : "Lưu thay đổi"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
