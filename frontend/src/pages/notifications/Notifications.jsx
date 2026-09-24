import { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import api from "../../services/api";

const SEVERITY_MAP = {
  info: {
    label: "Thông tin",
    icon: Info,
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  warning: {
    label: "Cảnh báo",
    icon: AlertTriangle,
    color: "#f59e0b",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  error: {
    label: "Lỗi",
    icon: XCircle,
    color: "#ef4444",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  critical: {
    label: "Nghiêm trọng",
    icon: AlertTriangle,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fca5a5",
  },
};

const TYPE_MAP = {
  su_co: { label: "Sự cố", color: "#ef4444", bg: "#fef2f2", icon: "🚨" },
  bao_tri: { label: "Bảo trì", color: "#f59e0b", bg: "#fffbeb", icon: "🔧" },
  dat_phong: {
    label: "Đặt phòng",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "📅",
  },
  he_thong: { label: "Hệ thống", color: "#6b7280", bg: "#f9fafb", icon: "⚙️" },
};

// Fallback data khi chưa có DB
const SAMPLE_FALLBACK = [
  {
    id: 1,
    content: "Thiết bị máy chiếu tại phòng B302 bị lỗi kết nối",
    type: "su_co",
    severity: "error",
    is_read: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 2,
    content: "Nhiệt độ cao bất thường tại phòng A403 — 32°C",
    type: "su_co",
    severity: "warning",
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    content: "Phòng B201 đã được đặt thành công — Ca học 14:00-16:00",
    type: "dat_phong",
    severity: "info",
    is_read: false,
    created_at: new Date(Date.now() - 5400000).toISOString(),
  },
  {
    id: 4,
    content: "Bảo trì điều hòa phòng A301 hoàn thành",
    type: "bao_tri",
    severity: "info",
    is_read: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 5,
    content: "Mô phỏng sự cố cháy tại phòng B403 — Mức độ nghiêm trọng",
    type: "su_co",
    severity: "critical",
    is_read: true,
    created_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 6,
    content: "Hệ thống đã khởi động lại thành công",
    type: "he_thong",
    severity: "info",
    is_read: true,
    created_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 7,
    content: "Thiết bị điều hòa phòng A201 cần bảo trì định kỳ",
    type: "bao_tri",
    severity: "warning",
    is_read: false,
    created_at: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: 8,
    content: "Đặt phòng A303 đã được duyệt thành công",
    type: "dat_phong",
    severity: "info",
    is_read: true,
    created_at: new Date(Date.now() - 21600000).toISOString(),
  },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useLocalState, setUseLocalState] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterRead, setFilterRead] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications");
      if (res.data && res.data.length > 0) {
        setNotifications(res.data);
        setUseLocalState(false);
      } else {
        // DB chưa có dữ liệu, dùng fallback sample
        setNotifications(SAMPLE_FALLBACK);
        setUseLocalState(true);
      }
    } catch (error) {
      console.warn("Không thể lấy thông báo từ API, dùng dữ liệu mẫu:", error);
      setNotifications(SAMPLE_FALLBACK);
      setUseLocalState(true);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (useLocalState) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      return;
    }
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error(error);
    }
  };

  const markRead = async (id) => {
    if (useLocalState) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      return;
    }
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNotif = async (id) => {
    if (useLocalState) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Xóa tất cả thông báo?")) return;
    if (useLocalState) {
      setNotifications([]);
      return;
    }
    try {
      await api.delete("/notifications/all");
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = notifications.filter((n) => {
    const matchType = filterType ? n.type === filterType : true;
    const matchRead =
      filterRead === "read"
        ? n.is_read
        : filterRead === "unread"
          ? !n.is_read
          : true;
    const matchSeverity = filterSeverity ? n.severity === filterSeverity : true;
    return matchType && matchRead && matchSeverity;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            Thông báo
            {unreadCount > 0 && (
              <span
                className="text-sm font-black text-white px-2.5 py-1 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                }}
              >
                {unreadCount} mới
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {unreadCount} thông báo chưa đọc
            {useLocalState && (
              <span className="ml-2 text-xs text-orange-400">(Dữ liệu mẫu)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <CheckCheck size={15} /> Đánh dấu đã đọc
          </button>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={15} /> Xóa tất cả
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Tổng thông báo",
            value: notifications.length,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🔔",
          },
          {
            label: "Chưa đọc",
            value: unreadCount,
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: "📬",
          },
          {
            label: "Sự cố",
            value: notifications.filter((n) => n.type === "su_co").length,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "🚨",
          },
          {
            label: "Đã đọc",
            value: notifications.filter((n) => n.is_read).length,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "✅",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: s.bg }}
            >
              {s.icon}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mr-1">
            <Filter size={13} /> Lọc:
          </div>

          {/* Read filter */}
          <div className="flex gap-1.5">
            {[
              { value: "", label: "Tất cả" },
              { value: "unread", label: "📬 Chưa đọc" },
              { value: "read", label: "✅ Đã đọc" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterRead(f.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2"
                style={{
                  background: filterRead === f.value ? "#eff6ff" : "white",
                  color: filterRead === f.value ? "#1a56db" : "#6b7280",
                  borderColor: filterRead === f.value ? "#1a56db" : "#e5e7eb",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Type filter */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType("")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2"
              style={{
                background: filterType === "" ? "#eff6ff" : "white",
                color: filterType === "" ? "#1a56db" : "#6b7280",
                borderColor: filterType === "" ? "#1a56db" : "#e5e7eb",
              }}
            >
              Tất cả loại
            </button>
            {Object.entries(TYPE_MAP).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilterType(k)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2"
                style={{
                  background: filterType === k ? v.bg : "white",
                  color: filterType === k ? v.color : "#6b7280",
                  borderColor: filterType === k ? v.color : "#e5e7eb",
                }}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-gray-100">
            <Bell size={56} className="mx-auto mb-4 text-gray-200" />
            <p className="text-base font-bold text-gray-300">
              Không có thông báo nào
            </p>
            <p className="text-sm text-gray-200 mt-1">
              Tất cả thông báo sẽ hiện ở đây
            </p>
          </div>
        ) : (
          filtered.map((notif) => {
            const severity = SEVERITY_MAP[notif.severity] || SEVERITY_MAP.info;
            const type = TYPE_MAP[notif.type] || TYPE_MAP.he_thong;
            const Icon = severity.icon;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border-2 transition-all cursor-pointer hover:shadow-md ${
                  !notif.is_read ? "shadow-sm" : ""
                }`}
                style={{
                  borderColor: !notif.is_read ? severity.border : "#f1f5f9",
                  background: !notif.is_read
                    ? `linear-gradient(135deg, white, ${severity.bg}88)`
                    : "white",
                }}
                onClick={() => markRead(notif.id)}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{
                      background: severity.bg,
                      border: `1px solid ${severity.border}`,
                    }}
                  >
                    <Icon size={19} style={{ color: severity.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full"
                        style={{ color: type?.color, background: type?.bg }}
                      >
                        {type?.icon} {type?.label}
                      </span>
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          color: severity.color,
                          background: severity.bg,
                        }}
                      >
                        {severity.label}
                      </span>
                      {!notif.is_read && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Mới
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${!notif.is_read ? "font-bold text-gray-800" : "font-medium text-gray-600"}`}
                    >
                      {notif.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1.5 font-medium">
                      🕐 {getTimeAgo(notif.created_at)} —{" "}
                      {new Date(notif.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(notif.id);
                        }}
                        className="p-2 rounded-xl text-blue-500 hover:bg-blue-100 transition-all"
                        title="Đánh dấu đã đọc"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(notif.id);
                      }}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-100 transition-all"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
