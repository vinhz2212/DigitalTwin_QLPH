import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

const INCIDENT_TYPES = {
  chay: {
    label: "Cháy",
    icon: "🔥",
    color: "#b91c1c",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  mat_dien: {
    label: "Mất điện",
    icon: "⚡",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  may_chieu_hong: {
    label: "Máy chiếu hỏng",
    icon: "📽️",
    color: "#7e22ce",
    bg: "#faf5ff",
    border: "#e9d5ff",
  },
  dieu_hoa_hong: {
    label: "Điều hòa hỏng",
    icon: "❄️",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  mat_internet: {
    label: "Mất Internet",
    icon: "🌐",
    color: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
  },
  qua_tai: {
    label: "Quá tải",
    icon: "👥",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fed7aa",
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

const INCIDENT_STATUS = {
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

const MAINTENANCE_STATUS = {
  cho_xu_ly: {
    label: "Chờ xử lý",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  dang_sua: {
    label: "Đang sửa",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  da_xong: {
    label: "Đã xong",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  huy: {
    label: "Đã hủy",
    color: "#475569",
    bg: "#f8fafc",
    border: "#e2e8f0",
  },
};

const EMPTY_INCIDENT_FORM = {
  room_id: "",
  type: "chay",
  description: "",
  severity: "trung",
};

const EMPTY_MAINTENANCE_FORM = {
  device_id: "",
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

function StatusBadge({ status, options }) {
  const value = options[status];

  if (!value) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
        Không xác định
      </span>
    );
  }

  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
      style={{
        color: value.color,
        backgroundColor: value.bg,
        borderColor: value.border,
      }}
    >
      {value.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, background }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value ?? 0}</p>
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

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={26} />
      </span>
      <p className="mt-4 font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default function Incidents() {
  const [tab, setTab] = useState("incidents");
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [incidentStats, setIncidentStats] = useState({});
  const [maintenanceStats, setMaintenanceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyItem, setBusyItem] = useState("");
  const [formError, setFormError] = useState("");

  const [incidentForm, setIncidentForm] = useState(EMPTY_INCIDENT_FORM);
  const [maintenanceForm, setMaintenanceForm] = useState(
    EMPTY_MAINTENANCE_FORM,
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const [inc, maint, incStats, maintStats, roomsRes, devicesRes] =
        await Promise.all([
          api.get("/incidents"),
          api.get("/maintenance"),
          api.get("/incidents/stats"),
          api.get("/maintenance/stats"),
          api.get("/rooms"),
          api.get("/devices"),
        ]);

      setIncidents(Array.isArray(inc.data) ? inc.data : []);
      setMaintenance(Array.isArray(maint.data) ? maint.data : []);
      setIncidentStats(incStats.data || {});
      setMaintenanceStats(maintStats.data || {});
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
    } catch (error) {
      console.error("Không thể tải dữ liệu sự cố/bảo trì:", error);
      setLoadError(
        error.response?.data?.message ||
          "Không thể tải dữ liệu. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const visibleIncidents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return incidents;

    return incidents.filter((incident) =>
      [
        incident.room_code,
        incident.building_name,
        incident.type,
        incident.description,
        incident.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [incidents, search]);

  const visibleMaintenance = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return maintenance;

    return maintenance.filter((item) =>
      [
        item.device_name,
        item.device_type,
        item.room_code,
        item.building_code,
        item.description,
        item.reported_by_name,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(keyword),
    );
  }, [maintenance, search]);

  const openModal = () => {
    setFormError("");
    setIncidentForm(EMPTY_INCIDENT_FORM);
    setMaintenanceForm(EMPTY_MAINTENANCE_FORM);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setFormError("");
  };

  const handleIncidentSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    try {
      setSaving(true);
      await api.post("/incidents", {
        ...incidentForm,
        room_id: Number(incidentForm.room_id),
        description: incidentForm.description.trim(),
      });

      setShowModal(false);
      setIncidentForm(EMPTY_INCIDENT_FORM);
      await fetchAll();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể tạo sự cố. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    try {
      setSaving(true);
      await api.post("/maintenance", {
        ...maintenanceForm,
        device_id: Number(maintenanceForm.device_id),
        description: maintenanceForm.description.trim(),
      });

      setShowModal(false);
      setMaintenanceForm(EMPTY_MAINTENANCE_FORM);
      await fetchAll();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể tạo yêu cầu bảo trì. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleIncidentStatus = async (id, status) => {
    try {
      setBusyItem(`incident-${id}`);
      await api.patch(`/incidents/${id}/status`, { status });
      await fetchAll();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể cập nhật trạng thái sự cố.",
      );
    } finally {
      setBusyItem("");
    }
  };

  const handleMaintenanceStatus = async (id, status) => {
    try {
      setBusyItem(`maintenance-${id}`);
      await api.patch(`/maintenance/${id}/status`, { status });
      await fetchAll();
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          "Không thể cập nhật trạng thái bảo trì.",
      );
    } finally {
      setBusyItem("");
    }
  };

  const handleDelete = async (kind, id) => {
    const isIncident = kind === "incident";
    const confirmed = window.confirm(
      isIncident
        ? "Bạn có chắc muốn xóa sự cố này?"
        : "Bạn có chắc muốn xóa yêu cầu bảo trì này?",
    );

    if (!confirmed) return;

    try {
      setBusyItem(`${kind}-${id}`);
      await api.delete(isIncident ? `/incidents/${id}` : `/maintenance/${id}`);
      await fetchAll();
    } catch (error) {
      window.alert(
        error.response?.data?.message ||
          "Không thể xóa dữ liệu. Vui lòng thử lại.",
      );
    } finally {
      setBusyItem("");
    }
  };

  const statCards =
    tab === "incidents"
      ? [
          {
            label: "Tổng sự cố",
            value: incidentStats.total,
            icon: AlertTriangle,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Đang xảy ra",
            value: incidentStats.active,
            icon: ShieldAlert,
            color: "#dc2626",
            background: "#fef2f2",
          },
          {
            label: "Đang xử lý",
            value: incidentStats.processing,
            icon: Clock3,
            color: "#d97706",
            background: "#fffbeb",
          },
          {
            label: "Đã giải quyết",
            value: incidentStats.resolved,
            icon: Check,
            color: "#16a34a",
            background: "#f0fdf4",
          },
        ]
      : [
          {
            label: "Tổng yêu cầu",
            value: maintenanceStats.total,
            icon: Wrench,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Chờ xử lý",
            value: maintenanceStats.pending,
            icon: Clock3,
            color: "#d97706",
            background: "#fffbeb",
          },
          {
            label: "Đang sửa",
            value: maintenanceStats.processing,
            icon: Wrench,
            color: "#2563eb",
            background: "#eff6ff",
          },
          {
            label: "Đã xong",
            value: maintenanceStats.done,
            icon: Check,
            color: "#16a34a",
            background: "#f0fdf4",
          },
        ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <ShieldAlert size={16} />
            <span>Vận hành hệ thống</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Sự cố &amp; Bảo trì
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi sự cố và xử lý yêu cầu bảo trì thiết bị.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-4 ${
            tab === "incidents"
              ? "bg-red-600 shadow-red-600/20 hover:bg-red-700 focus:ring-red-100"
              : "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600 focus:ring-amber-100"
          }`}
        >
          <Plus size={18} />
          {tab === "incidents" ? "Báo sự cố" : "Báo hỏng thiết bị"}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statCards.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex">
            <button
              type="button"
              onClick={() => {
                setTab("incidents");
                setSearch("");
              }}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition sm:px-6 ${
                tab === "incidents"
                  ? "border-red-500 bg-red-50/60 text-red-700"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <AlertTriangle size={17} />
              Sự cố
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {incidents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab("maintenance");
                setSearch("");
              }}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-4 text-sm font-semibold transition sm:px-6 ${
                tab === "maintenance"
                  ? "border-amber-500 bg-amber-50/60 text-amber-700"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Wrench size={17} />
              Bảo trì
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {maintenance.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
            <label className="relative block min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm trong danh sách..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </label>
            <button
              type="button"
              onClick={fetchAll}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            >
              Tải lại
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-blue-600" />
            <p className="text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : loadError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <p className="font-semibold text-slate-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchAll}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : tab === "incidents" ? (
          visibleIncidents.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={
                search ? "Không tìm thấy sự cố phù hợp" : "Chưa có sự cố nào"
              }
              description="Thử thay đổi từ khóa hoặc tạo báo cáo sự cố mới."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-red-50/60">
                  <tr>
                    {[
                      "Sự cố",
                      "Phòng",
                      "Mô tả",
                      "Mức độ",
                      "Thời gian",
                      "Trạng thái",
                      "",
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
                  {visibleIncidents.map((incident) => {
                    const type = INCIDENT_TYPES[incident.type];
                    const busy = busyItem === `incident-${incident.id}`;

                    return (
                      <tr
                        key={incident.id}
                        className="transition hover:bg-red-50/20"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                              style={{
                                backgroundColor: type?.bg || "#f8fafc",
                              }}
                            >
                              {type?.icon || "⚠️"}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {type?.label || incident.type || "Sự cố"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-blue-700">
                            {incident.room_code || "—"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {incident.building_name || "Tòa nhà"} · Tầng{" "}
                            {incident.floor_number ?? "—"}
                          </p>
                        </td>
                        <td className="max-w-64 px-5 py-4">
                          <p
                            className="truncate text-sm text-slate-600"
                            title={incident.description || ""}
                          >
                            {incident.description || "Không có mô tả"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={incident.severity}
                            options={SEVERITY_MAP}
                          />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDateTime(incident.occurred_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative w-fit">
                            <select
                              value={incident.status}
                              disabled={busy}
                              onChange={(event) =>
                                handleIncidentStatus(
                                  incident.id,
                                  event.target.value,
                                )
                              }
                              aria-label="Cập nhật trạng thái sự cố"
                              className="max-w-40 appearance-none rounded-full border-0 py-1.5 pl-3 pr-8 text-xs font-semibold outline-none ring-1 ring-inset ring-transparent focus:ring-red-300 disabled:opacity-60"
                              style={{
                                color:
                                  INCIDENT_STATUS[incident.status]?.color ||
                                  "#475569",
                                backgroundColor:
                                  INCIDENT_STATUS[incident.status]?.bg ||
                                  "#f8fafc",
                              }}
                            >
                              {Object.entries(INCIDENT_STATUS).map(
                                ([key, value]) => (
                                  <option key={key} value={key}>
                                    {value.label}
                                  </option>
                                ),
                              )}
                            </select>
                            <ChevronDown
                              size={13}
                              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleDelete("incident", incident.id)
                            }
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Xóa sự cố"
                            aria-label="Xóa sự cố"
                          >
                            {busy ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : visibleMaintenance.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={
              search
                ? "Không tìm thấy yêu cầu phù hợp"
                : "Chưa có yêu cầu bảo trì"
            }
            description="Thử thay đổi từ khóa hoặc tạo báo hỏng thiết bị mới."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-amber-50/60">
                <tr>
                  {[
                    "Thiết bị",
                    "Phòng",
                    "Mô tả",
                    "Người báo",
                    "Thời gian",
                    "Trạng thái",
                    "",
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
                {visibleMaintenance.map((item) => {
                  const busy = busyItem === `maintenance-${item.id}`;

                  return (
                    <tr
                      key={item.id}
                      className="transition hover:bg-amber-50/20"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {item.device_name || "Thiết bị"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.device_type || "Chưa rõ loại"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-blue-700">
                          {item.room_code || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {item.building_code || "—"}
                        </p>
                      </td>
                      <td className="max-w-64 px-5 py-4">
                        <p
                          className="truncate text-sm text-slate-600"
                          title={item.description || ""}
                        >
                          {item.description || "Không có mô tả"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {item.reported_by_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDateTime(item.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="relative w-fit">
                          <select
                            value={item.status}
                            disabled={busy}
                            onChange={(event) =>
                              handleMaintenanceStatus(
                                item.id,
                                event.target.value,
                              )
                            }
                            aria-label="Cập nhật trạng thái bảo trì"
                            className="max-w-40 appearance-none rounded-full border-0 py-1.5 pl-3 pr-8 text-xs font-semibold outline-none ring-1 ring-inset ring-transparent focus:ring-amber-300 disabled:opacity-60"
                            style={{
                              color:
                                MAINTENANCE_STATUS[item.status]?.color ||
                                "#475569",
                              backgroundColor:
                                MAINTENANCE_STATUS[item.status]?.bg ||
                                "#f8fafc",
                            }}
                          >
                            {Object.entries(MAINTENANCE_STATUS).map(
                              ([key, value]) => (
                                <option key={key} value={key}>
                                  {value.label}
                                </option>
                              ),
                            )}
                          </select>
                          <ChevronDown
                            size={13}
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDelete("maintenance", item.id)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Xóa yêu cầu"
                          aria-label="Xóa yêu cầu bảo trì"
                        >
                          {busy ? (
                            <LoaderCircle size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    tab === "incidents" ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {tab === "incidents" ? "Báo cáo sự cố" : "Yêu cầu bảo trì"}
                </p>
                <h2
                  id="incident-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {tab === "incidents" ? "Tạo sự cố mới" : "Báo hỏng thiết bị"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            {tab === "incidents" ? (
              <form onSubmit={handleIncidentSubmit} className="space-y-5 p-6">
                <div>
                  <label
                    htmlFor="incident-room"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phòng xảy ra sự cố
                  </label>
                  <select
                    id="incident-room"
                    value={incidentForm.room_id}
                    onChange={(event) =>
                      setIncidentForm((current) => ({
                        ...current,
                        room_id: event.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
                  >
                    <option value="">Chọn phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.code} — {room.name || "Phòng học"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Loại sự cố
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(INCIDENT_TYPES).map(([key, value]) => {
                      const selected = incidentForm.type === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setIncidentForm((current) => ({
                              ...current,
                              type: key,
                            }))
                          }
                          className="rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                          style={{
                            borderColor: selected ? value.color : "#e2e8f0",
                            backgroundColor: selected ? value.bg : "white",
                          }}
                        >
                          <span className="text-lg">{value.icon}</span>
                          <span
                            className="mt-1 block text-xs font-semibold"
                            style={{
                              color: selected ? value.color : "#475569",
                            }}
                          >
                            {value.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Mức độ
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(SEVERITY_MAP).map(([key, value]) => {
                      const selected = incidentForm.severity === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setIncidentForm((current) => ({
                              ...current,
                              severity: key,
                            }))
                          }
                          className="rounded-xl border px-2 py-2.5 text-xs font-semibold transition"
                          style={{
                            color: selected ? value.color : "#64748b",
                            backgroundColor: selected ? value.bg : "white",
                            borderColor: selected ? value.color : "#e2e8f0",
                          }}
                        >
                          {value.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="incident-description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mô tả
                  </label>
                  <textarea
                    id="incident-description"
                    value={incidentForm.description}
                    onChange={(event) =>
                      setIncidentForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Mô tả vị trí và tình trạng sự cố..."
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-50"
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

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Plus size={17} />
                        Tạo sự cố
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleMaintenanceSubmit}
                className="space-y-5 p-6"
              >
                <div>
                  <label
                    htmlFor="maintenance-device"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Thiết bị cần bảo trì
                  </label>
                  <select
                    id="maintenance-device"
                    value={maintenanceForm.device_id}
                    onChange={(event) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        device_id: event.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
                  >
                    <option value="">Chọn thiết bị</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name || device.type_name || "Thiết bị"} ·{" "}
                        {device.room_code || "Chưa rõ phòng"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="maintenance-description"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Mô tả tình trạng
                  </label>
                  <textarea
                    id="maintenance-description"
                    value={maintenanceForm.description}
                    onChange={(event) =>
                      setMaintenanceForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Mô tả lỗi và tình trạng của thiết bị..."
                    required
                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-50"
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

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={17} className="animate-spin" />
                        Đang gửi...
                      </>
                    ) : (
                      <>
                        <Wrench size={17} />
                        Gửi yêu cầu
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
