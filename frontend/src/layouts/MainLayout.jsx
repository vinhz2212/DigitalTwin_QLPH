import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  LogOut,
  Box,
  Home,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";

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
      { to: "/devices", icon: Cpu, label: "Thiết bị" },
      { to: "/bookings", icon: History, label: "Lịch sử đặt phòng" },
      { to: "/schedules", icon: Calendar, label: "Lịch học" },
      { to: "/users", icon: Users, label: "Người dùng" },
      { to: "/incidents", icon: AlertTriangle, label: "Sự cố & Bảo trì" },
      { to: "/simulation", icon: Activity, label: "Mô phỏng sự cố" },
      { to: "/statistics", icon: TrendingUp, label: "Thống kê" },
    ],
  },
  {
    group: "HỆ THỐNG",
    items: [
      { to: "/sensors", icon: Radio, label: "Cảm biến IoT" },
      { to: "/energy", icon: Zap, label: "Điện năng" },
      { to: "/reports", icon: BarChart3, label: "Báo cáo" },
      { to: "/notifications", icon: Bell, label: "Thông báo", badge: 3 },
      { to: "/logs", icon: ClipboardList, label: "Nhật ký hoạt động" },
      { to: "/ai", icon: Bot, label: "AI Assistant" },
      { to: "/settings", icon: Settings, label: "Cài đặt" },
    ],
  },
];

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

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());
  const [notifications] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    }[user?.role] || user?.role;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col transition-all duration-300 shadow-lg z-20"
        style={{
          width: collapsed ? "64px" : "240px",
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          borderRight: "1px solid #334155",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-lg"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b82f6)" }}
          >
            🎓
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold text-white">SmartCampus</p>
              <p className="text-xs text-slate-400">Digital Twin</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navGroups.map((group, gi) => (
            <div key={gi} className="mb-2">
              {group.group && !collapsed && (
                <p className="text-xs font-semibold text-slate-500 px-3 pt-4 pb-2 uppercase tracking-widest">
                  {group.group}
                </p>
              )}
              {group.items.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative mb-0.5 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                        : "text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 font-medium">{label}</span>
                  )}
                  {!collapsed && badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User info */}
        {!collapsed && (
          <div className="mx-3 mb-2 p-3 rounded-xl bg-slate-700/50 border border-slate-600">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              >
                {user?.full_name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-xs text-slate-400">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Collapse button */}
        <div className="border-t border-slate-700 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-all"
          >
            <ChevronLeft
              size={17}
              className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              {currentPage.title}
            </h1>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Home size={11} />
              <span>/</span>
              <span>{currentPage.sub}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock */}
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-700 font-mono">
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

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200" />

            {/* Notification */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative text-gray-500 hover:text-blue-600 transition-colors"
            >
              <Bell size={20} />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </button>

            {/* User */}
            <div className="flex items-center gap-2 pl-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                }}
              >
                {user?.full_name?.charAt(0) || "A"}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-gray-700 leading-tight">
                  {user?.full_name || "Admin"}
                </p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-1 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
