import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Shuffle,
  Siren,
  Trash2,
  X,
  Zap,
} from "lucide-react";

const INCIDENT_TYPES = {
  chay: {
    label: "Cháy",
    icon: "🔥",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
    description: "Phát hiện khói hoặc lửa trong phòng",
  },
  mat_dien: {
    label: "Mất điện",
    icon: "⚡",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    description: "Mất nguồn điện toàn phòng",
  },
  may_chieu_hong: {
    label: "Máy chiếu hỏng",
    icon: "📽️",
    color: "#7e22ce",
    bg: "#faf5ff",
    border: "#e9d5ff",
    description: "Máy chiếu không hoạt động",
  },
  dieu_hoa_hong: {
    label: "Điều hòa hỏng",
    icon: "❄️",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    description: "Hệ thống điều hòa ngừng hoạt động",
  },
  mat_internet: {
    label: "Mất Internet",
    icon: "🌐",
    color: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
    description: "Phòng mất kết nối mạng",
  },
  qua_tai: {
    label: "Quá tải",
    icon: "👥",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
    description: "Số người vượt quá sức chứa phòng",
  },
};

const SEVERITY_MAP = {
  thap: {
    label: "Thấp",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  trung: {
    label: "Trung bình",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  cao: {
    label: "Cao",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
  },
  nghiem_trong: {
    label: "Nghiêm trọng",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
  },
};

const STATUS_MAP = {
  dang_xay_ra: {
    label: "Đang xảy ra",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  dang_xu_ly: {
    label: "Đang xử lý",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  da_giai_quyet: {
    label: "Đã giải quyết",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
};

const INITIAL_FORM = {
  room_id: "",
  type: "chay",
  severity: "trung",
  description: "",
};

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
  });
}

function Badge({ item, fallback = "Chưa xác định" }) {
  if (!item) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
        {fallback}
      </span>
    );
  }

  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: item.color,
        backgroundColor: item.bg,
        borderColor: item.border,
      }}
    >
      {item.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, background }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ color, backgroundColor: background }}
      >
        <Icon size={20} />
      </span>
    </div>
  );
}

export default function Simulation() {
  const [rooms, setRooms] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingActive, setLoadingActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [log, setLog] = useState([]);

  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const response = await api.get("/rooms");
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchActive = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) setRefreshing(true);

      const response = await api.get("/simulation/active");
      setActiveIncidents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải sự cố đang hoạt động:", error);
    } finally {
      setLoadingActive(false);
      if (showRefreshState) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchActive();
  }, [fetchRooms, fetchActive]);

  useSocket({
    incident_simulated: () => fetchActive(),
    incident_resolved: () => fetchActive(),
  });

  const addLog = (message, type = "info") => {
    const time = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setLog((current) => [{ message, type, time }, ...current].slice(0, 30));
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFormError("");
  };

  const handleTrigger = async (event) => {
    event.preventDefault();
    setFormError("");

    try {
      setTriggering(true);

      await api.post("/simulation/trigger", {
        ...form,
        room_id: Number(form.room_id),
        description: form.description.trim(),
      });

      const selectedRoom = rooms.find(
        (room) => String(room.id) === String(form.room_id),
      );
      const type = INCIDENT_TYPES[form.type];

      addLog(
        `${type?.icon || "⚠️"} Kích hoạt "${type?.label || form.type}" tại phòng ${selectedRoom?.code || "không rõ"}`,
        "success",
      );

      setForm((current) => ({
        ...current,
        room_id: "",
        description: "",
      }));

      await fetchActive();
      await fetchRooms();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể kích hoạt sự cố.";
      setFormError(message);
      addLog(`Lỗi: ${message}`, "error");
    } finally {
      setTriggering(false);
    }
  };

  const handleResolve = async (incident) => {
    try {
      setResolvingId(incident.id);

      await api.post("/simulation/resolve", {
        incident_id: incident.id,
        room_id: incident.room_id,
      });

      addLog(
        `Đã giải quyết sự cố tại phòng ${incident.room_code || "không rõ"}`,
        "success",
      );

      await fetchActive();
      await fetchRooms();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể giải quyết sự cố.";
      addLog(message, "error");
    } finally {
      setResolvingId(null);
    }
  };

  const handleRandom = async () => {
    try {
      setRandomLoading(true);
      await api.post("/simulation/random");

      addLog("Mô phỏng sự cố ngẫu nhiên thành công.", "success");
      await fetchActive();
      await fetchRooms();
    } catch (error) {
      const message =
        error.response?.data?.message || "Không thể mô phỏng ngẫu nhiên.";
      addLog(message, "error");
    } finally {
      setRandomLoading(false);
    }
  };

  const activeCount = activeIncidents.filter(
    (incident) => incident.status === "dang_xay_ra",
  ).length;
  const processingCount = activeIncidents.filter(
    (incident) => incident.status === "dang_xu_ly",
  ).length;

  const stats = [
    {
      label: "Đang xảy ra",
      value: activeCount,
      icon: AlertTriangle,
      color: "#dc2626",
      background: "#fef2f2",
    },
    {
      label: "Đang xử lý",
      value: processingCount,
      icon: LoaderCircle,
      color: "#d97706",
      background: "#fffbeb",
    },
    {
      label: "Chưa giải quyết",
      value: activeIncidents.length,
      icon: Siren,
      color: "#2563eb",
      background: "#eff6ff",
    },
    {
      label: "Sự kiện trong log",
      value: log.length,
      icon: Clock3,
      color: "#7c3aed",
      background: "#f5f3ff",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <Zap size={16} />
            <span>Kiểm thử vận hành</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Mô phỏng sự cố
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo tình huống thử nghiệm và theo dõi trạng thái theo thời gian
            thực.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              fetchActive(true);
              fetchRooms();
            }}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleRandom}
            disabled={randomLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {randomLoading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Shuffle size={17} />
            )}
            {randomLoading ? "Đang mô phỏng..." : "Mô phỏng ngẫu nhiên"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm 2xl:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Zap size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Kích hoạt sự cố</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Chọn phòng và tình huống cần mô phỏng.
              </p>
            </div>
          </div>

          <form onSubmit={handleTrigger} className="space-y-5">
            <div>
              <label
                htmlFor="simulation-room"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Phòng học
              </label>
              <div className="relative">
                <select
                  id="simulation-room"
                  value={form.room_id}
                  onChange={(event) =>
                    updateForm("room_id", event.target.value)
                  }
                  disabled={loadingRooms || triggering}
                  required
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:bg-slate-50"
                >
                  <option value="">
                    {loadingRooms ? "Đang tải phòng..." : "Chọn phòng"}
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.code} · {room.name || "Phòng học"} ·{" "}
                      {room.status === "trong"
                        ? "Đang trống"
                        : room.status === "dang_hoc"
                          ? "Đang sử dụng"
                          : room.status || "Chưa rõ trạng thái"}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Loại sự cố
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(INCIDENT_TYPES).map(([key, item]) => {
                  const selected = form.type === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={triggering}
                      onClick={() => updateForm("type", key)}
                      className="rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-60"
                      style={{
                        borderColor: selected ? item.color : "#e2e8f0",
                        backgroundColor: selected ? item.bg : "white",
                      }}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span
                        className="mt-1 block text-xs font-semibold"
                        style={{
                          color: selected ? item.color : "#475569",
                        }}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {INCIDENT_TYPES[form.type]?.description}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">
                Mức độ
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(SEVERITY_MAP).map(([key, item]) => {
                  const selected = form.severity === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={triggering}
                      onClick={() => updateForm("severity", key)}
                      className="rounded-xl border px-2 py-2.5 text-xs font-semibold transition disabled:opacity-60"
                      style={{
                        color: selected ? item.color : "#64748b",
                        backgroundColor: selected ? item.bg : "white",
                        borderColor: selected ? item.color : "#e2e8f0",
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="simulation-description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Mô tả{" "}
                <span className="font-normal text-slate-400">
                  (không bắt buộc)
                </span>
              </label>
              <textarea
                id="simulation-description"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                rows={3}
                disabled={triggering}
                placeholder={INCIDENT_TYPES[form.type]?.description}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50 disabled:bg-slate-50"
              />
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={triggering || loadingRooms || rooms.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {triggering ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Đang kích hoạt...
                </>
              ) : (
                <>
                  <Zap size={17} />
                  Kích hoạt sự cố
                </>
              )}
            </button>
          </form>
        </section>

        <div className="space-y-5 2xl:col-span-3">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Siren size={19} />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Sự cố chưa giải quyết
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {activeIncidents.length} sự cố đang được theo dõi
                  </p>
                </div>
              </div>

              {activeIncidents.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
              )}
            </div>

            {loadingActive ? (
              <div className="flex min-h-48 items-center justify-center">
                <LoaderCircle
                  size={26}
                  className="animate-spin text-blue-600"
                />
              </div>
            ) : activeIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                  <CheckCircle2 size={27} />
                </span>
                <p className="mt-4 font-semibold text-slate-800">
                  Không có sự cố tồn đọng
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Hệ thống đang hoạt động bình thường.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {activeIncidents.map((incident) => {
                  const type = INCIDENT_TYPES[incident.type];
                  const severity = SEVERITY_MAP[incident.severity];
                  const status = STATUS_MAP[incident.status];
                  const resolving = resolvingId === incident.id;

                  return (
                    <article
                      key={incident.id}
                      className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                      style={{
                        borderColor: type?.border || "#e2e8f0",
                        backgroundColor: type?.bg || "#f8fafc",
                      }}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                          {type?.icon || "⚠️"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className="font-semibold"
                              style={{ color: type?.color || "#334155" }}
                            >
                              {type?.label || incident.type || "Sự cố"}
                            </h3>
                            <Badge item={severity} />
                            <Badge item={status} />
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-700">
                            Phòng {incident.room_code || "—"}
                            {incident.building_name
                              ? ` · ${incident.building_name}`
                              : ""}
                            {incident.floor_number != null
                              ? ` · Tầng ${incident.floor_number}`
                              : ""}
                          </p>
                          {incident.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {incident.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(incident.occurred_at)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleResolve(incident)}
                        disabled={resolving}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {resolving ? (
                          <LoaderCircle size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        {resolving ? "Đang xử lý..." : "Giải quyết"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Nhật ký thao tác
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sự kiện phát sinh trong phiên hiện tại
                </p>
              </div>

              {log.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLog([])}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                >
                  Xóa nhật ký
                </button>
              )}
            </div>

            {log.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">
                Chưa có thao tác nào trong phiên này.
              </p>
            ) : (
              <ol className="max-h-64 space-y-2 overflow-y-auto p-4">
                {log.map((entry, index) => (
                  <li
                    key={`${entry.time}-${index}`}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm ${
                      entry.type === "success"
                        ? "bg-green-50 text-green-800"
                        : entry.type === "error"
                          ? "bg-red-50 text-red-700"
                          : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    <time className="shrink-0 pt-0.5 font-mono text-xs text-slate-400">
                      {entry.time}
                    </time>
                    <span>{entry.message}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
