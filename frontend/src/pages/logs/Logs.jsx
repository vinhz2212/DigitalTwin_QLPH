import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useSocket from "../../hooks/useSocket";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
} from "lucide-react";

const ACTION_MAP = {
  SIMULATE_INCIDENT: {
    label: "Mô phỏng sự cố",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "⚡",
  },
  ROOM_BOOKED: {
    label: "Đặt phòng",
    color: "#1d4ed8",
    background: "#eff6ff",
    icon: "📅",
  },
  ROOM_CREATED: {
    label: "Tạo phòng",
    color: "#1d4ed8",
    background: "#eff6ff",
    icon: "🏫",
  },
  DEVICE_UPDATED: {
    label: "Cập nhật thiết bị",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🔧",
  },
  DEVICE_CREATED: {
    label: "Thêm thiết bị",
    color: "#15803d",
    background: "#f0fdf4",
    icon: "🖥️",
  },
  DEVICE_STATUS_UPDATED: {
    label: "Đổi trạng thái thiết bị",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🔧",
  },
  DEVICE_DELETED: {
    label: "Xóa thiết bị",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  INCIDENT_CREATED: {
    label: "Tạo sự cố",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🚨",
  },
  INCIDENT_RESOLVED: {
    label: "Giải quyết sự cố",
    color: "#15803d",
    background: "#f0fdf4",
    icon: "✅",
  },
  INCIDENT_STATUS_UPDATED: {
    label: "Cập nhật sự cố",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🚨",
  },
  INCIDENT_DELETED: {
    label: "Xóa sự cố",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  USER_LOGIN: {
    label: "Đăng nhập",
    color: "#4f46e5",
    background: "#eef2ff",
    icon: "🔐",
  },
  USER_LOGIN_FAILED: {
    label: "Đăng nhập thất bại",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "⛔",
  },
  USER_LOGOUT: {
    label: "Đăng xuất",
    color: "#475569",
    background: "#f8fafc",
    icon: "🚪",
  },
  ROOM_UPDATED: {
    label: "Cập nhật phòng",
    color: "#7e22ce",
    background: "#faf5ff",
    icon: "🏫",
  },
  ROOM_STATUS_UPDATED: {
    label: "Đổi trạng thái phòng",
    color: "#7e22ce",
    background: "#faf5ff",
    icon: "🏫",
  },
  ROOM_DELETED: {
    label: "Xóa phòng",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  USER_REGISTER: {
    label: "Đăng ký tài khoản",
    color: "#4f46e5",
    background: "#eef2ff",
    icon: "👤",
  },
  USER_CREATED: {
    label: "Tạo người dùng",
    color: "#4f46e5",
    background: "#eef2ff",
    icon: "👤",
  },
  USER_UPDATED: {
    label: "Cập nhật người dùng",
    color: "#7c3aed",
    background: "#f5f3ff",
    icon: "👤",
  },
  USER_PASSWORD_RESET: {
    label: "Đặt lại mật khẩu",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🔑",
  },
  USER_DELETED: {
    label: "Xóa người dùng",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  PROFILE_UPDATED: {
    label: "Cập nhật hồ sơ",
    color: "#2563eb",
    background: "#eff6ff",
    icon: "👤",
  },
  PASSWORD_CHANGED: {
    label: "Đổi mật khẩu",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🔑",
  },
  BOOKING_CREATED: {
    label: "Tạo yêu cầu đặt phòng",
    color: "#1d4ed8",
    background: "#eff6ff",
    icon: "📅",
  },
  BOOKING_STATUS_UPDATED: {
    label: "Duyệt yêu cầu đặt phòng",
    color: "#15803d",
    background: "#f0fdf4",
    icon: "✅",
  },
  BOOKING_DELETED: {
    label: "Xóa lượt đặt phòng",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  SCHEDULE_CREATED: {
    label: "Thêm lịch học/thi",
    color: "#0891b2",
    background: "#ecfeff",
    icon: "📚",
  },
  SCHEDULE_UPDATED: {
    label: "Cập nhật lịch học/thi",
    color: "#0891b2",
    background: "#ecfeff",
    icon: "📚",
  },
  SCHEDULE_DELETED: {
    label: "Xóa lịch học/thi",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  MAINTENANCE_CREATED: {
    label: "Tạo phiếu bảo trì",
    color: "#b45309",
    background: "#fffbeb",
    icon: "🛠️",
  },
  MAINTENANCE_STATUS_UPDATED: {
    label: "Cập nhật bảo trì",
    color: "#7c3aed",
    background: "#f5f3ff",
    icon: "🛠️",
  },
  MAINTENANCE_DELETED: {
    label: "Xóa phiếu bảo trì",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
  SENSOR_SNAPSHOT_CREATED: {
    label: "Lưu dữ liệu cảm biến",
    color: "#0891b2",
    background: "#ecfeff",
    icon: "🌡️",
  },
  ACTIVITY_LOG_DELETED: {
    label: "Xóa nhật ký",
    color: "#b91c1c",
    background: "#fef2f2",
    icon: "🗑️",
  },
};

const ENTITY_COLORS = {
  Incident: "#dc2626",
  Device: "#d97706",
  Room: "#2563eb",
  User: "#7c3aed",
  Booking: "#16a34a",
  Maintenance: "#7c3aed",
  Schedule: "#0891b2",
  SensorReading: "#0f766e",
  ActivityLog: "#475569",
};

const ENTITY_LABELS = {
  Incident: "Sự cố",
  Device: "Thiết bị",
  Room: "Phòng",
  User: "Người dùng",
  Booking: "Đặt phòng",
  Maintenance: "Bảo trì",
  Schedule: "Lịch học/thi",
  SensorReading: "Cảm biến",
  ActivityLog: "Nhật ký",
};

const LIMIT_OPTIONS = [50, 100, 200, 500];

function parseDetails(details) {
  if (!details) return "";

  if (typeof details === "string") {
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getTimeAgo(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}

function StatCard({
  label,
  compactLabel = label,
  value,
  icon: Icon,
  color,
  background,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">
          <span className="2xl:hidden">{compactLabel}</span>
          <span className="hidden 2xl:inline">{label}</span>
        </p>
        <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      </div>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ color, backgroundColor: background }}
      >
        <Icon size={20} />
      </span>
    </div>
  );
}

function ActionBadge({ action }) {
  const info = ACTION_MAP[action];

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        color: info?.color || "#475569",
        backgroundColor: info?.background || "#f1f5f9",
      }}
    >
      <span>{info?.icon || "🔹"}</span>
      {info?.label || action || "Hoạt động khác"}
    </span>
  );
}

function EntityBadge({ type, id }) {
  if (!type) {
    return <span className="text-xs text-slate-400">Không có đối tượng</span>;
  }

  const color = ENTITY_COLORS[type] || "#64748b";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="rounded-lg px-2 py-1 text-xs font-semibold"
        style={{ color, backgroundColor: `${color}15` }}
      >
        {ENTITY_LABELS[type] || type}
      </span>
      {id != null && (
        <span className="font-mono text-xs text-slate-400">#{id}</span>
      )}
    </span>
  );
}

export default function Logs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [limit, setLimit] = useState(100);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRange, setAppliedRange] = useState({ from: "", to: "" });

  const fetchLogs = useCallback(
    async (mode = "initial") => {
      try {
        if (mode === "refresh") setRefreshing(true);
        if (mode === "initial") setLoading(true);

        setErrorMessage("");

        const response = await api.get("/logs", {
          params: {
            limit,
            ...(appliedRange.from ? { from: appliedRange.from } : {}),
            ...(appliedRange.to ? { to: appliedRange.to } : {}),
          },
        });
        setLogs(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Không thể tải nhật ký:", error);
        setErrorMessage(
          error.response?.data?.message ||
            "Không thể tải nhật ký hoạt động. Vui lòng thử lại.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit, appliedRange],
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useSocket({
    activity_log_created: () => fetchLogs("silent"),
  });

  const applyDateRange = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setErrorMessage("Ngày bắt đầu không được sau ngày kết thúc.");
      return;
    }

    const nextRange = { from: fromDate, to: toDate };
    if (
      nextRange.from === appliedRange.from &&
      nextRange.to === appliedRange.to
    ) {
      fetchLogs("refresh");
      return;
    }
    setAppliedRange(nextRange);
  };

  const clearDateRange = () => {
    setFromDate("");
    setToDate("");
    if (!appliedRange.from && !appliedRange.to) {
      fetchLogs("refresh");
      return;
    }
    setAppliedRange({ from: "", to: "" });
  };

  const handleDelete = async (log) => {
    if (!isAdmin || deletingId !== null) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa nhật ký "${ACTION_MAP[log.action]?.label || log.action}" này không?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(log.id);
      setErrorMessage("");

      await api.delete(`/logs/${log.id}`);
      await fetchLogs("refresh");
    } catch (error) {
      console.error("Không thể xóa nhật ký:", error);
      setErrorMessage(
        error.response?.data?.message ||
          "Không thể xóa nhật ký. Vui lòng thử lại.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const uniqueActions = useMemo(
    () => [...new Set(logs.map((log) => log.action).filter(Boolean))],
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return logs.filter((log) => {
      const detailsText = parseDetails(log.details);

      const searchText = [
        log.action,
        ACTION_MAP[log.action]?.label,
        log.full_name,
        log.username,
        log.entity_type,
        log.entity_id,
        log.ip_address,
        detailsText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");

      const matchesSearch = !keyword || searchText.includes(keyword);
      const matchesAction = !filterAction || log.action === filterAction;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, filterAction]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();

    return {
      total: logs.length,
      today: logs.filter((log) => {
        const date = new Date(log.created_at);
        return !Number.isNaN(date.getTime()) && date.toDateString() === today;
      }).length,
      incidents: logs.filter((log) =>
        String(log.action || "").includes("INCIDENT"),
      ).length,
      users: new Set(logs.map((log) => log.user_id).filter(Boolean)).size,
    };
  }, [logs]);

  return (
    <div className="space-y-4 pb-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Activity size={16} />
            <span>Giám sát hệ thống</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-[26px]">
            Nhật ký hoạt động
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi các thao tác được ghi nhận trong hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLogs("refresh")}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard
          label="Hoạt động trong danh sách"
          compactLabel="Đã tải"
          value={stats.total}
          icon={Activity}
          color="#2563eb"
          background="#eff6ff"
        />
        <StatCard
          label="Hôm nay"
          value={stats.today}
          icon={Clock3}
          color="#16a34a"
          background="#f0fdf4"
        />
        <StatCard
          label="Liên quan sự cố"
          compactLabel="Sự cố"
          value={stats.incidents}
          icon={AlertTriangle}
          color="#dc2626"
          background="#fef2f2"
        />
        <StatCard
          label="Người dùng"
          compactLabel="Tài khoản"
          value={stats.users}
          icon={UsersRound}
          color="#7c3aed"
          background="#f5f3ff"
        />
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => fetchLogs("refresh")}
            className="self-start rounded-lg bg-white px-3 py-2 font-semibold text-red-700 shadow-sm hover:bg-red-100 sm:self-auto"
          >
            Thử lại
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <label className="relative block flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm hành động, người dùng, đối tượng..."
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
            <select
              value={filterAction}
              onChange={(event) => setFilterAction(event.target.value)}
              aria-label="Lọc theo hành động"
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:w-56"
            >
              <option value="">Tất cả hành động</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {ACTION_MAP[action]?.label || action}
                </option>
              ))}
            </select>

            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              aria-label="Số lượng nhật ký"
              className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:w-40"
            >
              {LIMIT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} bản ghi
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2 xl:flex-row xl:items-center">
          <div className="min-w-0 xl:mr-auto">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays size={17} className="text-blue-600" />
              Thời gian ghi nhận
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>
                Đang hiển thị {filteredLogs.length} / {logs.length} bản ghi đã tải
                {(appliedRange.from || appliedRange.to) && (
                  <>
                    {" · "}
                    Khoảng ngày đã được áp dụng
                  </>
                )}
              </span>
              {(search || filterAction) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilterAction("");
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2 min-[380px]:grid-cols-2 xl:flex xl:shrink-0 xl:items-end">
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Từ ngày
              </span>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="min-h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:w-40"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Đến ngày
              </span>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(event) => setToDate(event.target.value)}
                className="min-h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:w-40"
              />
            </label>
            <div className="flex gap-2 min-[380px]:col-span-2 xl:shrink-0">
              <button
                type="button"
                onClick={applyDateRange}
                disabled={loading || refreshing}
                className="min-h-10 flex-1 whitespace-nowrap rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 xl:min-w-24"
              >
                Áp dụng
              </button>
              <button
                type="button"
                onClick={clearDateRange}
                disabled={loading || refreshing}
                className="min-h-10 flex-1 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 xl:min-w-24"
              >
                Xóa ngày
              </button>
            </div>
          </div>
        </div>

      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Các hoạt động gần đây
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Mới nhất được hiển thị trước.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-blue-600" />
            <p className="text-sm">Đang tải nhật ký...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Activity size={26} />
            </span>
            <p className="mt-4 font-semibold text-slate-800">
              {search || filterAction
                ? "Không tìm thấy hoạt động phù hợp"
                : "Chưa có nhật ký hoạt động"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Các hoạt động được ghi nhận sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <>
            {/* Bố cục cho điện thoại */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredLogs.map((log) => {
                const details = parseDetails(log.details);
                const detailsPreview = details.replace(/\s+/g, " ");

                return (
                  <article key={log.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <ActionBadge action={log.action} />
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-right text-xs text-slate-500">
                          {getTimeAgo(log.created_at)}
                        </span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDelete(log)}
                            disabled={deletingId !== null}
                            title="Xóa nhật ký"
                            aria-label="Xóa nhật ký"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === log.id ? (
                              <LoaderCircle
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={17} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                        {log.full_name?.trim()?.charAt(0)?.toUpperCase() || "S"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {log.full_name || "Hệ thống"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {log.username || "Tài khoản hệ thống"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <EntityBadge type={log.entity_type} id={log.entity_id} />
                      <time className="text-xs text-slate-400">
                        {formatDateTime(log.created_at)}
                      </time>
                      {log.ip_address && (
                        <span className="font-mono text-xs text-slate-400">
                          IP: {log.ip_address}
                        </span>
                      )}
                    </div>

                    {detailsPreview && (
                      <p className="break-words rounded-lg bg-slate-50 p-2.5 font-mono text-xs text-slate-500">
                        {detailsPreview}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Bố cục cho máy tính */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Thời gian",
                      "Người dùng",
                      "Hành động",
                      "Đối tượng",
                      "Địa chỉ IP",
                      "Chi tiết",
                      ...(isAdmin ? ["Thao tác"] : []),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const details = parseDetails(log.details);

                    return (
                      <tr
                        key={log.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">
                            {formatDateTime(log.created_at)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {getTimeAgo(log.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                              {log.full_name
                                ?.trim()
                                ?.charAt(0)
                                ?.toUpperCase() || "S"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {log.full_name || "Hệ thống"}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {log.username || "Tài khoản hệ thống"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <ActionBadge action={log.action} />
                        </td>

                        <td className="px-5 py-4">
                          <EntityBadge
                            type={log.entity_type}
                            id={log.entity_id}
                          />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">
                          {log.ip_address || "—"}
                        </td>

                        <td className="max-w-72 px-5 py-4">
                          <p
                            className="truncate font-mono text-xs text-slate-500"
                            title={details}
                          >
                            {details || "—"}
                          </p>
                        </td>

                        {isAdmin && (
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => handleDelete(log)}
                              disabled={deletingId !== null}
                              title="Xóa nhật ký"
                              aria-label="Xóa nhật ký"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === log.id ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
