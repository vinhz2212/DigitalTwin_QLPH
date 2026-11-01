import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import useSocket from "../hooks/useSocket";
import {
  LayoutDashboard,
  Building2,
  Cpu,
  History,
  Calendar,
  Users,
  AlertTriangle,
  Activity,
  Radio,
  Zap,
  BarChart3,
  Bell,
  ClipboardList,
  Bot,
  Settings,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  Box,
  Home,
  TrendingUp,
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudFog,
  CloudSnow,
  CloudLightning,
  MapPin,
  LoaderCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

const aiAlertSeenKey = (userId) => `smart-campus-ai-alert-seen:${userId}`;

function getLastSeenAiAlertId(userId) {
  try {
    const id = Number(sessionStorage.getItem(aiAlertSeenKey(userId)));
    return Number.isSafeInteger(id) && id > 0 ? id : 0;
  } catch {
    return 0;
  }
}

function saveLastSeenAiAlertId(userId, id) {
  if (!userId || !Number.isSafeInteger(id) || id <= 0) return;
  try {
    sessionStorage.setItem(
      aiAlertSeenKey(userId),
      String(Math.max(getLastSeenAiAlertId(userId), id)),
    );
  } catch {
    // Trình duyệt chặn lưu trữ: huy hiệu vẫn hoạt động trong lần mở trang này.
  }
}

const PAGE_TITLES = {
  "/dashboard": { title: "Tổng quan", sub: "Digital Twin Smart Campus" },
  "/twin": { title: "Digital Twin 3D", sub: "Mô hình tòa nhà" },
  "/rooms": { title: "Quản lý Phòng học", sub: "Danh sách phòng học" },
  "/devices": { title: "Quản lý Thiết bị", sub: "Danh sách thiết bị" },
  "/bookings": { title: "Lịch sử đặt phòng", sub: "Quản lý đặt phòng" },
  "/schedules": { title: "Lịch học", sub: "Thời khóa biểu" },
  "/users": { title: "Người dùng", sub: "Quản lý tài khoản" },
  "/incidents": { title: "Sự cố & Bảo trì", sub: "Quản lý sự cố" },
  "/simulation": { title: "Mô phỏng sự cố", sub: "Kích hoạt sự cố mô phỏng" },
  "/statistics": { title: "Thống kê", sub: "Báo cáo & phân tích" },
  "/sensors": { title: "Cảm biến IoT", sub: "Dữ liệu cảm biến" },
  "/energy": { title: "Điện năng", sub: "Theo dõi điện năng" },
  "/reports": { title: "Báo cáo", sub: "Xuất báo cáo" },
  "/notifications": { title: "Thông báo", sub: "Quản lý thông báo" },
  "/logs": { title: "Nhật ký hoạt động", sub: "Lịch sử hệ thống" },
  "/ai": { title: "AI Assistant", sub: "Trợ lý thông minh Gemini" },
  "/settings": { title: "Cài đặt", sub: "Cấu hình hệ thống" },
};

function getWeatherInfo(code) {
  if (code === 0) {
    return { label: "Trời quang", icon: Sun, color: "#f59e0b" };
  }

  if (code === 1) {
    return { label: "Ít mây", icon: CloudSun, color: "#f59e0b" };
  }

  if (code === 2) {
    return { label: "Có mây", icon: CloudSun, color: "#64748b" };
  }

  if (code === 3) {
    return { label: "Nhiều mây", icon: Cloud, color: "#64748b" };
  }

  if (code === 45 || code === 48) {
    return { label: "Sương mù", icon: CloudFog, color: "#64748b" };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: "Có mưa", icon: CloudRain, color: "#2563eb" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: "Có tuyết", icon: CloudSnow, color: "#0ea5e9" };
  }

  if ([95, 96, 99].includes(code)) {
    return { label: "Mưa dông", icon: CloudLightning, color: "#7c3aed" };
  }

  return { label: "Thời tiết", icon: Cloud, color: "#64748b" };
}

function WeatherWidget() {
  const [weather, setWeather] = useState({
    status: "loading",
    temperature: null,
    code: null,
    city: "",
    message: "",
  });

  const loadWeather = useCallback(() => {
    if (!navigator.geolocation) {
      setWeather({
        status: "unavailable",
        temperature: null,
        code: null,
        city: "",
        message: "Trình duyệt không hỗ trợ vị trí",
      });
      return;
    }

    setWeather((previous) => ({
      ...previous,
      status: "loading",
      message: "",
    }));

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const locationParams = new URLSearchParams({
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            localityLanguage: "vi",
          });

          const weatherParams = new URLSearchParams({
            latitude: String(coords.latitude),
            longitude: String(coords.longitude),
            current: "temperature_2m,weather_code",
            timezone: "auto",
          });

          const [weatherResponse, cityResponse] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?${weatherParams.toString()}`,
            ),
            fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?${locationParams.toString()}`,
            ).catch(() => null),
          ]);

          if (!weatherResponse.ok) {
            throw new Error("Không lấy được dữ liệu thời tiết.");
          }

          const weatherData = await weatherResponse.json();
          const current = weatherData.current;

          if (
            typeof current?.temperature_2m !== "number" ||
            typeof current?.weather_code !== "number"
          ) {
            throw new Error("Dữ liệu thời tiết không hợp lệ.");
          }

          let city = "Vị trí hiện tại";

          if (cityResponse?.ok) {
            const locationData = await cityResponse.json();
            city =
              locationData.city ||
              locationData.locality ||
              locationData.principalSubdivision ||
              locationData.countryName ||
              city;
          }

          setWeather({
            status: "ready",
            temperature: Math.round(current.temperature_2m),
            code: current.weather_code,
            city,
            message: "",
          });
        } catch (error) {
          console.error("Không thể tải thời tiết:", error);
          setWeather({
            status: "error",
            temperature: null,
            code: null,
            city: "",
            message: "Không tải được thời tiết",
          });
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Cho phép vị trí để xem thời tiết"
            : "Không lấy được vị trí";

        setWeather({
          status: "location-error",
          temperature: null,
          code: null,
          city: "",
          message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000,
      },
    );
  }, []);

  useEffect(() => {
    loadWeather();

    const interval = setInterval(loadWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  const weatherInfo =
    weather.status === "ready" ? getWeatherInfo(weather.code) : null;
  const WeatherIcon = weatherInfo?.icon || MapPin;

  return (
    <button
      type="button"
      onClick={loadWeather}
      title={weather.message || "Bấm để cập nhật thời tiết"}
      aria-label={
        weather.status === "ready"
          ? `${weather.city}, ${weather.temperature} độ C, ${weatherInfo.label}`
          : weather.message || "Cập nhật thời tiết"
      }
      className="hidden items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100 sm:flex"
    >
      {weather.status === "loading" ? (
        <LoaderCircle size={19} className="animate-spin text-slate-400" />
      ) : (
        <WeatherIcon
          size={21}
          style={{ color: weatherInfo?.color || "#64748b" }}
        />
      )}

      <span className="min-w-0">
        <span className="block max-w-36 truncate text-sm font-bold leading-tight text-slate-700">
          {weather.status === "ready" ? weather.city : "Thời tiết"}
        </span>
        <span className="block text-[11px] leading-tight text-slate-400">
          {weather.status === "ready"
            ? `${weather.temperature}°C · ${weatherInfo.label}`
            : weather.message || "Đang lấy vị trí"}
        </span>
      </span>
    </button>
  );
}

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuPath, setMobileMenuPath] = useState(null);
  const mobileMenuOpen = mobileMenuPath === location.pathname;
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState(0);
  const [aiUnreadIds, setAiUnreadIds] = useState([]);
  const role = user?.role;
  const userId = user?.id;
  const username = user?.username;
  const viewingAiRef = useRef(location.pathname === "/ai");

  useEffect(() => {
    viewingAiRef.current = location.pathname === "/ai";
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const sidebar = sidebarRef.current;
    const focusable = () =>
      [...sidebar.querySelectorAll("a[href], button:not([disabled])")].filter(
        (element) => element.getClientRects().length > 0,
      );
    sidebar.querySelector("[data-close-mobile-menu]")?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuPath(null);
        menuButtonRef.current?.focus();
      } else if (event.key === "Tab") {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia("(min-width: 1024px)");
    const closeMobileMenu = (event) => {
      if (event.matches) setMobileMenuPath(null);
    };
    desktopBreakpoint.addEventListener("change", closeMobileMenu);
    return () => desktopBreakpoint.removeEventListener("change", closeMobileMenu);
  }, []);

  const receiveAiAlerts = useCallback((alerts) => {
    if (!userId || !Array.isArray(alerts)) return;
    const ids = alerts
      .map((alert) => Number(alert.id))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    if (viewingAiRef.current) {
      if (ids.length) saveLastSeenAiAlertId(userId, Math.max(...ids));
      setAiUnreadIds([]);
      return;
    }
    setAiUnreadIds((previous) => [
      ...new Set([...previous, ...ids].filter((id) => id > getLastSeenAiAlertId(userId))),
    ]);
  }, [userId]);

  const fetchAiAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await api.get("/ai/incident-alerts");
      receiveAiAlerts(res.data);
    } catch (error) {
      console.error("Không thể lấy số cảnh báo AI chưa xem:", error);
    }
  }, [receiveAiAlerts, userId]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setNotifications(Number(res.data?.count) || 0);
    } catch (error) {
      console.error("Không thể lấy số thông báo chưa đọc:", error);
    }
  }, []);

  const handleNotificationCreated = useCallback(
    (notification) => {
      fetchUnreadCount();

      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      try {
        const preferenceId = userId || username || "default";
        const saved = JSON.parse(
          localStorage.getItem(`smart-campus-notifications:${preferenceId}`) ||
            "{}",
        );
        const preferenceByType = {
          su_co: "incident",
          bao_tri: "maintenance",
          dat_phong: "booking",
          he_thong: "system",
        };
        const typePreference = preferenceByType[notification?.type];

        if (
          saved.browser === false ||
          (typePreference && saved[typePreference] === false)
        ) {
          return;
        }

        new Notification("SmartCampus", {
          body: notification?.content || "Bạn có thông báo mới.",
        });
      } catch (error) {
        console.error("Không thể hiển thị thông báo trình duyệt:", error);
      }
    },
    [fetchUnreadCount, userId, username],
  );

  useSocket({
    notification_created: handleNotificationCreated,
    notification_updated: fetchUnreadCount,
    ai_incident_alert: (alert) => receiveAiAlerts([alert]),
    account_changed: () => window.location.reload(),
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);
    const handleNotificationsUpdated = () => fetchUnreadCount();

    window.addEventListener(
      "notifications:updated",
      handleNotificationsUpdated,
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener(
        "notifications:updated",
        handleNotificationsUpdated,
      );
    };
  }, [fetchUnreadCount, location.pathname]);

  useEffect(() => {
    fetchAiAlerts();
    const interval = setInterval(fetchAiAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAiAlerts, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPage = PAGE_TITLES[location.pathname] || {
    title: "Smart Campus",
    sub: "",
  };

  const roleLabel =
    {
      admin: "Quản trị viên",
      giang_vien: "Giảng viên",
      ky_thuat_vien: "Kỹ thuật viên",
    }[role] || role;

  const navGroups = [
    {
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
        { to: "/twin", icon: Box, label: "Digital Twin" },
      ],
    },
    {
      group: "QUẢN LÝ",
      items: [
        { to: "/rooms", icon: Building2, label: "Phòng học" },
        ...(role === "admin" || role === "ky_thuat_vien"
          ? [{ to: "/devices", icon: Cpu, label: "Thiết bị" }]
          : []),
        ...(role === "admin" || role === "giang_vien" || role === "ky_thuat_vien"
          ? [
              { to: "/bookings", icon: History, label: "Lịch sử đặt phòng" },
              ...(role !== "ky_thuat_vien"
                ? [{ to: "/schedules", icon: Calendar, label: "Lịch học" }]
                : []),
            ]
          : []),
        ...(role === "admin"
          ? [{ to: "/users", icon: Users, label: "Người dùng" }]
          : []),
        ...(role === "admin" || role === "ky_thuat_vien"
          ? [
              {
                to: "/incidents",
                icon: AlertTriangle,
                label: "Sự cố & Bảo trì",
              },
              { to: "/simulation", icon: Activity, label: "Mô phỏng sự cố" },
            ]
          : []),
        { to: "/statistics", icon: TrendingUp, label: "Thống kê" },
      ],
    },
    {
      group: "HỆ THỐNG",
      items: [
        ...(role === "admin" || role === "ky_thuat_vien"
          ? [
              { to: "/sensors", icon: Radio, label: "Cảm biến IoT" },
              { to: "/energy", icon: Zap, label: "Điện năng" },
              { to: "/reports", icon: BarChart3, label: "Báo cáo" },
              { to: "/logs", icon: ClipboardList, label: "Nhật ký hoạt động" },
            ]
          : []),
        {
          to: "/notifications",
          icon: Bell,
          label: "Thông báo",
          badge: notifications,
        },
        { to: "/ai", icon: Bot, label: "AI Assistant", badge: aiUnreadIds.length },
        { to: "/settings", icon: Settings, label: "Cài đặt" },
      ],
    },
  ];

  return (
    <div className="flex h-screen h-dvh min-w-0 overflow-hidden bg-[#f4f7fb]">
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/55 lg:hidden"
          aria-label="Đóng menu điều hướng"
          onClick={() => {
            setMobileMenuPath(null);
            menuButtonRef.current?.focus();
          }}
        />
      )}
      <aside
        ref={sidebarRef}
        id="app-sidebar"
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen ? "true" : undefined}
        aria-label="Điều hướng chính"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(84vw,300px)] flex-col shadow-lg transition-[transform,width,visibility] duration-300 lg:relative lg:inset-auto lg:z-20 lg:visible lg:translate-x-0 ${collapsed ? "lg:w-[68px]" : "lg:w-[252px]"} ${mobileMenuOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
        style={{
          background: "linear-gradient(180deg, #071a39 0%, #0b2447 55%, #10294a 100%)",
          borderRight: "1px solid rgba(96,165,250,0.16)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-slate-700 px-4 py-4">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b82f6)" }}
          >
            🎓
          </div>

          <div className={collapsed ? "min-w-0 lg:hidden" : "min-w-0"}>
            <p className="text-sm font-bold text-white">SmartCampus</p>
            <p className="text-xs text-slate-400">Digital Twin</p>
          </div>
          <button
            type="button"
            data-close-mobile-menu
            aria-label="Đóng menu"
            onClick={() => {
              setMobileMenuPath(null);
              menuButtonRef.current?.focus();
            }}
            className="ml-auto rounded-lg p-2 text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-2">
              {group.group && (
                <p className={`px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-widest text-slate-500 ${collapsed ? "lg:hidden" : ""}`}>
                  {group.group}
                </p>
              )}

              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuPath(null)}
                  className={({ isActive }) =>
                    `relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-blue-950/40"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />

                  <span className={`flex-1 font-medium ${collapsed ? "lg:hidden" : ""}`}>{label}</span>

                  {badge > 0 && (
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ${collapsed ? "lg:hidden" : ""}`}>
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}

                  {collapsed && badge > 0 && (
                    <span
                      className="absolute right-1 top-1 hidden h-2.5 w-2.5 rounded-full bg-red-500 lg:block"
                      title={`${badge} thông báo chưa đọc`}
                    />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className={`mx-3 mb-2 rounded-xl border border-slate-600 bg-slate-700/50 p-3 ${collapsed ? "lg:hidden" : ""}`}>
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              >
                {user?.full_name?.charAt(0) || "A"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="text-slate-400 transition-colors hover:text-red-400"
                title="Đăng xuất"
              >
                <LogOut size={15} />
              </button>
            </div>
        </div>

        <div className="hidden border-t border-slate-700 p-2 lg:block">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all hover:bg-slate-700 hover:text-white"
          >
            <ChevronLeft
              size={17}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Mở menu điều hướng"
              aria-controls="app-sidebar"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuPath(location.pathname)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-gray-800 sm:text-lg">
                {currentPage.title}
              </h1>
              <div className="hidden items-center gap-1 text-xs text-gray-400 sm:flex">
                <Home size={11} />
                <span>/</span>
                <span>{currentPage.sub}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <WeatherWidget />

            <div className="hidden text-right md:block">
              <p className="font-mono text-sm font-bold text-gray-700">
                {time.toLocaleTimeString("vi-VN")}
              </p>
              <p className="text-xs text-gray-400">
                {time.toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="hidden h-8 w-px bg-gray-200 md:block" />

            <button
              type="button"
              onClick={() => navigate("/notifications")}
              aria-label={`Thông báo, ${notifications} thông báo chưa đọc`}
              className="relative text-gray-500 transition-colors hover:text-blue-600"
            >
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {notifications > 99 ? "99+" : notifications}
                </span>
              )}
            </button>

            <div className="hidden items-center gap-2 pl-1 sm:flex sm:pl-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              >
                {user?.full_name?.charAt(0) || "A"}
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-semibold leading-tight text-gray-700">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="ml-1 rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto bg-[#f4f7fb] p-3 sm:p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
