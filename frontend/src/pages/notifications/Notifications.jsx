import { useCallback, useEffect, useMemo, useState } from "react";
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
import useSocket from "../../hooks/useSocket";

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

function notifyLayout() {
  window.dispatchEvent(new Event("notifications:updated"));
}

function getTimeAgo(dateStr) {
  if (!dateStr) return "";

  const timestamp = new Date(dateStr).getTime();
  if (Number.isNaN(timestamp)) return "";

  const mins = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));

  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;

  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterRead, setFilterRead] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const res = await api.get("/notifications");
      setNotifications(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Không thể lấy thông báo:", error);
      setNotifications([]);
      setErrorMessage(
        error.response?.data?.message ||
          "Không thể tải thông báo. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useSocket({ notification_created: fetchNotifications });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((notification) => ({ ...notification, is_read: true })),
      );

      notifyLayout();
    } catch (error) {
      console.error("Không thể đánh dấu tất cả đã đọc:", error);
      setErrorMessage(
        error.response?.data?.message || "Không thể đánh dấu thông báo đã đọc.",
      );
    }
  };

  const markRead = async (id) => {
    const notification = notifications.find((item) => item.id === id);

    if (!notification || notification.is_read) return;

    try {
      await api.patch(`/notifications/${id}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, is_read: true } : item,
        ),
      );

      notifyLayout();
    } catch (error) {
      console.error("Không thể đánh dấu thông báo đã đọc:", error);
      setErrorMessage(
        error.response?.data?.message || "Không thể đánh dấu thông báo đã đọc.",
      );
    }
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);

      setNotifications((previous) =>
        previous.filter((notification) => notification.id !== id),
      );

      notifyLayout();
    } catch (error) {
      console.error("Không thể xóa thông báo:", error);
      setErrorMessage(
        error.response?.data?.message || "Không thể xóa thông báo.",
      );
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm("Xóa tất cả thông báo?")) return;

    try {
      await api.delete("/notifications/all");
      setNotifications([]);
      notifyLayout();
    } catch (error) {
      console.error("Không thể xóa thông báo:", error);
      setErrorMessage(
        error.response?.data?.message || "Không thể xóa tất cả thông báo.",
      );
    }
  };

  const filtered = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchType = filterType ? notification.type === filterType : true;

        const matchRead =
          filterRead === "read"
            ? Boolean(notification.is_read)
            : filterRead === "unread"
              ? !notification.is_read
              : true;

        const matchSeverity = filterSeverity
          ? notification.severity === filterSeverity
          : true;

        return matchType && matchRead && matchSeverity;
      }),
    [notifications, filterType, filterRead, filterSeverity],
  );

  const stats = useMemo(
    () => [
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
        value: notifications.filter((item) => item.type === "su_co").length,
        color: "#ef4444",
        bg: "#fef2f2",
        icon: "🚨",
      },
      {
        label: "Đã đọc",
        value: notifications.filter((item) => item.is_read).length,
        color: "#22c55e",
        bg: "#f0fdf4",
        icon: "✅",
      },
    ],
    [notifications, unreadCount],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-black text-gray-800">
            Thông báo
            {unreadCount > 0 && (
              <span
                className="rounded-full px-2.5 py-1 text-sm font-black text-white"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #f97316)",
                }}
              >
                {unreadCount} mới
              </span>
            )}
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {unreadCount} thông báo chưa đọc
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Đánh dấu đã đọc
          </button>

          <button
            type="button"
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="flex items-center gap-2 rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-bold text-red-500 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={15} />
            Xóa tất cả
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={fetchNotifications}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-red-700 hover:bg-red-100 sm:self-auto"
          >
            Tải lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
          >
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ background: stat.bg }}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400">{stat.label}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-1.5 text-xs font-bold text-gray-400">
            <Filter size={13} />
            Lọc:
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "", label: "Tất cả" },
              { value: "unread", label: "📬 Chưa đọc" },
              { value: "read", label: "✅ Đã đọc" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setFilterRead(filter.value)}
                className="rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all"
                style={{
                  background: filterRead === filter.value ? "#eff6ff" : "white",
                  color: filterRead === filter.value ? "#1a56db" : "#6b7280",
                  borderColor:
                    filterRead === filter.value ? "#1a56db" : "#e5e7eb",
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-gray-200 sm:block" />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType("")}
              className="rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: filterType === "" ? "#eff6ff" : "white",
                color: filterType === "" ? "#1a56db" : "#6b7280",
                borderColor: filterType === "" ? "#1a56db" : "#e5e7eb",
              }}
            >
              Tất cả loại
            </button>

            {Object.entries(TYPE_MAP).map(([key, type]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterType(key)}
                className="rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all"
                style={{
                  background: filterType === key ? type.bg : "white",
                  color: filterType === key ? type.color : "#6b7280",
                  borderColor: filterType === key ? type.color : "#e5e7eb",
                }}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="notification-severity">
            Lọc theo mức độ
          </label>
          <select
            id="notification-severity"
            value={filterSeverity}
            onChange={(event) => setFilterSeverity(event.target.value)}
            className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 outline-none focus:border-blue-400"
          >
            <option value="">Tất cả mức độ</option>
            {Object.entries(SEVERITY_MAP).map(([key, severity]) => (
              <option key={key} value={key}>
                {severity.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <Bell size={56} className="mx-auto mb-4 text-gray-200" />
            <p className="text-base font-bold text-gray-500">
              {notifications.length === 0
                ? "Chưa có thông báo"
                : "Không có thông báo phù hợp"}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              Thông báo mới sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          filtered.map((notification) => {
            const severity =
              SEVERITY_MAP[notification.severity] || SEVERITY_MAP.info;
            const type = TYPE_MAP[notification.type] || TYPE_MAP.he_thong;
            const Icon = severity.icon;

            return (
              <article
                key={notification.id}
                className={`cursor-pointer rounded-2xl border-2 transition-all hover:shadow-md ${
                  !notification.is_read ? "shadow-sm" : ""
                }`}
                style={{
                  borderColor: !notification.is_read
                    ? severity.border
                    : "#f1f5f9",
                  background: !notification.is_read
                    ? `linear-gradient(135deg, white, ${severity.bg}88)`
                    : "white",
                }}
                onClick={() => markRead(notification.id)}
              >
                <div className="flex items-start gap-4 p-4">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl shadow-sm"
                    style={{
                      background: severity.bg,
                      border: `1px solid ${severity.border}`,
                    }}
                  >
                    <Icon size={19} style={{ color: severity.color }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-black"
                        style={{ color: type.color, background: type.bg }}
                      >
                        {type.icon} {type.label}
                      </span>

                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{
                          color: severity.color,
                          background: severity.bg,
                        }}
                      >
                        {severity.label}
                      </span>

                      {!notification.is_read && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-black text-blue-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          Mới
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-sm leading-relaxed ${
                        !notification.is_read
                          ? "font-bold text-gray-800"
                          : "font-medium text-gray-600"
                      }`}
                    >
                      {notification.content}
                    </p>

                    <p className="mt-1.5 text-xs font-medium text-gray-400">
                      🕐 {getTimeAgo(notification.created_at)}
                      {notification.created_at && (
                        <>
                          {" "}
                          —{" "}
                          {new Date(notification.created_at).toLocaleString(
                            "vi-VN",
                          )}
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!notification.is_read && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          markRead(notification.id);
                        }}
                        className="rounded-xl p-2 text-blue-500 transition-all hover:bg-blue-100"
                        title="Đánh dấu đã đọc"
                        aria-label="Đánh dấu đã đọc"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteNotif(notification.id);
                      }}
                      className="rounded-xl p-2 text-red-400 transition-all hover:bg-red-100"
                      title="Xóa"
                      aria-label="Xóa thông báo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
