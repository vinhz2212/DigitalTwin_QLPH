import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  EyeOff,
  Globe,
  LockKeyhole,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  User,
} from "lucide-react";

const DEFAULT_NOTIFICATIONS = {
  email: true,
  browser: true,
  incident: true,
  maintenance: true,
  booking: false,
  system: true,
};

const DEFAULT_APPEARANCE = {
  language: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  dateFormat: "DD/MM/YYYY",
  refreshInterval: "10",
  compactMode: false,
  showAnimations: true,
};

const ROLE_LABELS = {
  admin: "Quản trị viên",
  giang_vien: "Giảng viên",
  ky_thuat_vien: "Kỹ thuật viên",
};

function readPreferences(key, defaults) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function TextField({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();

  const preferenceId = user?.id || user?.username || "default";
  const notificationStorageKey = `smart-campus-notifications:${preferenceId}`;
  const appearanceStorageKey = `smart-campus-appearance:${preferenceId}`;

  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [notifications, setNotifications] = useState(() =>
    readPreferences(
      `smart-campus-notifications:${preferenceId}`,
      DEFAULT_NOTIFICATIONS,
    ),
  );
  const [appearance, setAppearance] = useState(() =>
    readPreferences(
      `smart-campus-appearance:${preferenceId}`,
      DEFAULT_APPEARANCE,
    ),
  );
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [preferencesError, setPreferencesError] = useState("");
  const [preferencesSuccess, setPreferencesSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const response = await api.get("/auth/me");
        if (!mounted) return;

        setProfile({
          full_name: response.data?.full_name || "",
          email: response.data?.email || "",
          phone: response.data?.phone || "",
        });
      } catch (error) {
        console.error("Không thể tải hồ sơ:", error);
        if (mounted) {
          setProfileError(
            error.response?.data?.message || "Không thể tải thông tin hồ sơ.",
          );
        }
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setNotifications(
      readPreferences(notificationStorageKey, DEFAULT_NOTIFICATIONS),
    );
    setAppearance(readPreferences(appearanceStorageKey, DEFAULT_APPEARANCE));
  }, [notificationStorageKey, appearanceStorageKey]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setLoadingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const response = await api.put("/users/profile", profile);
      const updatedUser = response.data?.user;

      if (updatedUser) {
        updateUser(updatedUser);
        setProfile({
          full_name: updatedUser.full_name || "",
          email: updatedUser.email || "",
          phone: updatedUser.phone || "",
        });
      }

      setProfileSuccess("Đã cập nhật hồ sơ.");
    } catch (error) {
      setProfileError(
        error.response?.data?.message || "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwords.current) {
      setPasswordError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }

    if (passwords.new.length < 6) {
      setPasswordError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoadingPassword(true);

    try {
      const response = await api.patch("/users/change-password", {
        current_password: passwords.current,
        new_password: passwords.new,
      });

      setPasswordSuccess(response.data?.message || "Đổi mật khẩu thành công.");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      setPasswordError(
        error.response?.data?.message || "Không thể đổi mật khẩu.",
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    setLoadingPreferences(true);
    setPreferencesError("");
    setPreferencesSuccess("");

    try {
      if (activeTab === "notifications") {
        localStorage.setItem(
          notificationStorageKey,
          JSON.stringify(notifications),
        );
      } else {
        localStorage.setItem(appearanceStorageKey, JSON.stringify(appearance));
      }

      setPreferencesSuccess("Đã lưu tùy chọn trên thiết bị này.");
    } catch (error) {
      console.error("Không thể lưu tùy chọn:", error);
      setPreferencesError("Trình duyệt không thể lưu tùy chọn.");
    } finally {
      setLoadingPreferences(false);
    }
  };

  const tabs = [
    { id: "profile", label: "Hồ sơ", icon: User },
    { id: "notifications", label: "Thông báo", icon: Bell },
    { id: "appearance", label: "Giao diện", icon: Palette },
    { id: "security", label: "Bảo mật", icon: Shield },
    { id: "system", label: "Hệ thống", icon: Database },
  ];

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab);
  const ActiveTabIcon = activeTabInfo?.icon || SettingsIcon;
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || "Người dùng";
  const canSavePreferences =
    activeTab === "notifications" || activeTab === "appearance";

  const notificationOptions = [
    {
      key: "email",
      label: "Thông báo qua email",
      description: "Tùy chọn nhận thông báo qua email.",
      icon: "✉️",
    },
    {
      key: "browser",
      label: "Thông báo trình duyệt",
      description: "Tùy chọn hiển thị thông báo trên trình duyệt.",
      icon: "🌐",
    },
    {
      key: "incident",
      label: "Cảnh báo sự cố",
      description: "Thông báo khi phát sinh sự cố.",
      icon: "🚨",
    },
    {
      key: "maintenance",
      label: "Nhắc bảo trì",
      description: "Nhắc lịch bảo trì thiết bị.",
      icon: "🔧",
    },
    {
      key: "booking",
      label: "Đặt phòng",
      description: "Thông báo về yêu cầu đặt phòng.",
      icon: "📅",
    },
    {
      key: "system",
      label: "Cập nhật hệ thống",
      description: "Thông báo về trạng thái và cập nhật hệ thống.",
      icon: "⚙️",
    },
  ];

  const appearanceOptions = [
    {
      label: "Ngôn ngữ",
      key: "language",
      options: [
        { value: "vi", label: "Tiếng Việt" },
        { value: "en", label: "English" },
      ],
    },
    {
      label: "Múi giờ",
      key: "timezone",
      options: [{ value: "Asia/Ho_Chi_Minh", label: "Hồ Chí Minh (GMT+7)" }],
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
      label: "Tần suất làm mới",
      key: "refreshInterval",
      options: [
        { value: "5", label: "5 giây" },
        { value: "10", label: "10 giây" },
        { value: "30", label: "30 giây" },
        { value: "60", label: "1 phút" },
      ],
    },
  ];

  const passwordFields = [
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
  ];

  return (
    <div className="space-y-5 pb-6">
      <header>
        <p className="mb-1 text-sm font-semibold text-blue-600">
          Tài khoản của bạn
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Cài đặt
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý hồ sơ và tùy chọn cá nhân.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-sm">
              {(profile.full_name || user?.username || "U")
                .charAt(0)
                .toUpperCase()}
            </div>
            <p className="mt-3 truncate font-bold text-slate-900">
              {profile.full_name || user?.username || "Tài khoản"}
            </p>
            <p className="mt-1 text-sm text-slate-500">{roleLabel}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Đang hoạt động
            </span>
          </section>

          <nav
            aria-label="Nhóm cài đặt"
            className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:block lg:space-y-1"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setProfileError("");
                    setProfileSuccess("");
                    setPasswordError("");
                    setPasswordSuccess("");
                    setPreferencesError("");
                    setPreferencesSuccess("");
                  }}
                  aria-current={selected ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:w-full ${
                    selected
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ActiveTabIcon size={19} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">
                {activeTabInfo?.label}
              </h2>
              <p className="text-xs text-slate-500">
                {activeTab === "profile" && "Thông tin cá nhân của bạn"}
                {activeTab === "notifications" &&
                  "Tùy chọn thông báo lưu trên thiết bị này"}
                {activeTab === "appearance" &&
                  "Tùy chọn hiển thị lưu trên thiết bị này"}
                {activeTab === "security" && "Cập nhật mật khẩu tài khoản"}
                {activeTab === "system" && "Thông tin ứng dụng"}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                {(profileError || profileSuccess) && (
                  <div
                    role={profileError ? "alert" : "status"}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      profileError
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {profileError || profileSuccess}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Họ và tên"
                    type="text"
                    autoComplete="name"
                    value={profile.full_name}
                    onChange={(event) =>
                      setProfile((previous) => ({
                        ...previous,
                        full_name: event.target.value,
                      }))
                    }
                    required
                  />

                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    required
                  />

                  <TextField
                    label="Số điện thoại"
                    type="tel"
                    autoComplete="tel"
                    placeholder="Ví dụ: 0901234567"
                    value={profile.phone}
                    onChange={(event) =>
                      setProfile((previous) => ({
                        ...previous,
                        phone: event.target.value,
                      }))
                    }
                  />

                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Vai trò
                    </span>
                    <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500">
                      {roleLabel} · Không thể thay đổi
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <button
                    type="submit"
                    disabled={loadingProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingProfile ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Save size={16} />
                    )}
                    {loadingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Các lựa chọn này hiện được lưu trong trình duyệt trên thiết bị
                  đang dùng. Gửi email và thông báo trình duyệt cần được kết nối
                  thêm với backend.
                </div>

                {preferencesError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {preferencesError}
                  </div>
                )}

                {notificationOptions.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.description}
                        </span>
                      </span>
                    </div>
                    <Toggle
                      checked={Boolean(notifications[item.key])}
                      onChange={(checked) =>
                        setNotifications((previous) => ({
                          ...previous,
                          [item.key]: checked,
                        }))
                      }
                      label={item.label}
                    />
                  </div>
                ))}

                <PreferenceSaveBar
                  success={preferencesSuccess}
                  loading={loadingPreferences}
                  onSave={handleSavePreferences}
                />
              </div>
            )}

            {activeTab === "appearance" && (
              <div className="space-y-5">
                {preferencesError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {preferencesError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {appearanceOptions.map((field) => (
                    <SelectField
                      key={field.key}
                      label={field.label}
                      value={appearance[field.key]}
                      options={field.options}
                      onChange={(event) =>
                        setAppearance((previous) => ({
                          ...previous,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Chế độ thu gọn
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Lưu lựa chọn hiển thị gọn cho lần sử dụng sau.
                      </p>
                    </div>
                    <Toggle
                      checked={appearance.compactMode}
                      onChange={(checked) =>
                        setAppearance((previous) => ({
                          ...previous,
                          compactMode: checked,
                        }))
                      }
                      label="Chế độ thu gọn"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Hiệu ứng động
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Lưu tùy chọn bật hoặc tắt hiệu ứng.
                      </p>
                    </div>
                    <Toggle
                      checked={appearance.showAnimations}
                      onChange={(checked) =>
                        setAppearance((previous) => ({
                          ...previous,
                          showAnimations: checked,
                        }))
                      }
                      label="Hiệu ứng động"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Các tùy chọn giao diện được lưu trên thiết bị này. Muốn áp
                  dụng chúng cho toàn ứng dụng cần kết nối các phần giao diện
                  tương ứng.
                </p>

                <PreferenceSaveBar
                  success={preferencesSuccess}
                  loading={loadingPreferences}
                  onSave={handleSavePreferences}
                />
              </div>
            )}

            {activeTab === "security" && (
              <form
                onSubmit={handleChangePassword}
                className="max-w-xl space-y-5"
              >
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      size={18}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Đổi mật khẩu
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        Mật khẩu mới cần có ít nhất 6 ký tự.
                      </p>
                    </div>
                  </div>
                </div>

                {(passwordError || passwordSuccess) && (
                  <div
                    role={passwordError ? "alert" : "status"}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      passwordError
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {passwordError || passwordSuccess}
                  </div>
                )}

                {passwordFields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {field.label}
                    </span>
                    <span className="relative block">
                      <input
                        type={showPassword[field.key] ? "text" : "password"}
                        autoComplete={
                          field.key === "current"
                            ? "current-password"
                            : "new-password"
                        }
                        value={passwords[field.key]}
                        onChange={(event) =>
                          setPasswords((previous) => ({
                            ...previous,
                            [field.key]: event.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((previous) => ({
                            ...previous,
                            [field.key]: !previous[field.key],
                          }))
                        }
                        aria-label={
                          showPassword[field.key]
                            ? "Ẩn mật khẩu"
                            : "Hiện mật khẩu"
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword[field.key] ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </span>
                  </label>
                ))}

                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingPassword ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Shield size={16} />
                  )}
                  {loadingPassword ? "Đang cập nhật..." : "Đổi mật khẩu"}
                </button>
              </form>
            )}

            {activeTab === "system" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={18} />
                    <p className="text-sm font-semibold">
                      Đang đăng nhập với tài khoản {roleLabel.toLowerCase()}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-emerald-700">
                    Tên đăng nhập: {user?.username || "—"}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: User,
                      label: "Tài khoản",
                      value: user?.username || "—",
                    },
                    {
                      icon: Globe,
                      label: "Ngôn ngữ giao diện",
                      value:
                        appearance.language === "vi" ? "Tiếng Việt" : "English",
                    },
                    {
                      icon: Clock3,
                      label: "Múi giờ đã chọn",
                      value: appearance.timezone,
                    },
                    {
                      icon: Database,
                      label: "Lưu tùy chọn",
                      value: "Trên trình duyệt này",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs text-slate-500">
                            {item.label}
                          </span>
                          <span className="mt-1 block truncate text-sm font-semibold text-slate-800">
                            {item.value}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {canSavePreferences && (
            <div className="border-t border-slate-100 px-4 py-4 sm:px-6">
              <PreferenceSaveBar
                success={preferencesSuccess}
                loading={loadingPreferences}
                onSave={handleSavePreferences}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PreferenceSaveBar({ success, loading, onSave }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
      <p className="text-sm text-emerald-700" role="status">
        {success || "Tùy chọn cá nhân được lưu trên thiết bị này."}
      </p>
      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Save size={16} />
        )}
        {loading ? "Đang lưu..." : "Lưu tùy chọn"}
      </button>
    </div>
  );
}
