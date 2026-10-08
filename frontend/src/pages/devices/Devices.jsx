import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Cpu,
  Edit2,
  Fan,
  Filter,
  Grid2X2,
  Lightbulb,
  List,
  Monitor,
  Plus,
  Power,
  Search,
  Snowflake,
  Speaker,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import api from "../../services/api";

const STATUS_MAP = {
  hoat_dong: {
    label: "Hoạt động",
    color: "#16834b",
    bg: "#eaf7ef",
    dot: "#2bb76e",
  },
  tat: {
    label: "Đã tắt",
    color: "#596579",
    bg: "#f0f2f5",
    dot: "#8491a3",
  },
  hong: {
    label: "Hỏng",
    color: "#b94343",
    bg: "#fff0ef",
    dot: "#e45d58",
  },
  dang_sua: {
    label: "Đang sửa",
    color: "#a7640c",
    bg: "#fff5e5",
    dot: "#eea738",
  },
};

const TYPE_MAP = {
  den: { label: "Đèn", icon: Lightbulb },
  dieu_hoa: { label: "Điều hòa", icon: Snowflake },
  may_chieu: { label: "Máy chiếu", icon: Monitor },
  quat: { label: "Quạt", icon: Fan },
  loa: { label: "Loa", icon: Speaker },
  may_tinh: { label: "Máy tính", icon: Cpu },
};

const EMPTY_FORM = {
  room_id: "",
  device_type_id: "",
  name: "",
  status: "tat",
  installed_at: "",
  notes: "",
};

function StatusBadge({ status }) {
  const item = STATUS_MAP[status] || {
    label: "Chưa rõ",
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color: item.color, background: item.bg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: item.dot }}
      />
      {item.label}
    </span>
  );
}

function StatCard({ label, value, color, bg, icon: Icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 items-center gap-3 rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: active ? color : "#edf0f3",
        boxShadow: active ? `0 0 0 3px ${color}16` : undefined,
      }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{ background: bg, color }}
      >
        <Icon size={20} strokeWidth={2.1} />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-gray-500">
          {label}
        </span>
        <span className="mt-0.5 block text-2xl font-black" style={{ color }}>
          {value}
        </span>
      </span>
    </button>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchDevices();
    fetchRooms();
    fetchTypes();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await api.get("/devices");
      setDevices(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách thiết bị:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await api.get("/devices/types");
      setTypes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải loại thiết bị:", error);
    }
  };

  const handleOpenModal = (device = null) => {
    setFormError("");

    if (device) {
      setEditDevice(device);
      setForm({
        room_id: device.room_id ? String(device.room_id) : "",
        device_type_id: device.device_type_id
          ? String(device.device_type_id)
          : "",
        name: device.name || "",
        status: device.status || "tat",
        installed_at: device.installed_at
          ? String(device.installed_at).split("T")[0].slice(0, 10)
          : "",
        notes: device.notes || "",
      });
    } else {
      setEditDevice(null);
      setForm({ ...EMPTY_FORM });
    }

    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.room_id || !form.device_type_id || !form.name.trim()) {
      setFormError("Vui lòng điền đầy đủ thông tin thiết bị.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        room_id: Number(form.room_id),
        device_type_id: Number(form.device_type_id),
        name: form.name.trim(),
        installed_at: form.installed_at || null,
        notes: form.notes.trim(),
      };

      if (editDevice) {
        await api.put(`/devices/${editDevice.id}`, payload);
      } else {
        await api.post("/devices", payload);
      }

      setShowModal(false);
      await fetchDevices();
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Không thể lưu thông tin thiết bị.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (device) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa thiết bị “${device.name}” không?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/devices/${device.id}`);
      await fetchDevices();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể xóa thiết bị này.",
      );
    }
  };

  const handleStatusChange = async (deviceId, status) => {
    try {
      await api.patch(`/devices/${deviceId}/status`, { status });
      await fetchDevices();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    }
  };

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return devices.filter((device) => {
      const matchesSearch =
        !query ||
        device.name?.toLowerCase().includes(query) ||
        device.room_code?.toLowerCase().includes(query);

      const matchesType =
        !filterType || String(device.device_type_id) === String(filterType);

      const matchesStatus = !filterStatus || device.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [devices, search, filterType, filterStatus]);

  const stats = {
    total: devices.length,
    hoat_dong: devices.filter((device) => device.status === "hoat_dong").length,
    tat: devices.filter((device) => device.status === "tat").length,
    hong: devices.filter((device) => device.status === "hong").length,
    dang_sua: devices.filter((device) => device.status === "dang_sua").length,
  };

  const clearFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterStatus("");
  };

  const hasActiveFilters = search || filterType || filterStatus;

  const getTypeInfo = (device) => {
    const knownType = TYPE_MAP[device.type_name];
    const apiType = types.find(
      (type) => String(type.id) === String(device.device_type_id),
    );

    return {
      label:
        knownType?.label || apiType?.name || device.type_name || "Thiết bị",
      Icon: knownType?.icon || Power,
    };
  };

  return (
    <div className="space-y-5">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Cpu size={14} />
            QUẢN LÝ CƠ SỞ VẬT CHẤT
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Thiết bị
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Theo dõi vị trí, tình trạng và lịch sử lắp đặt thiết bị.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: "linear-gradient(135deg, #1768e8, #4b8df4)",
            boxShadow: "0 7px 18px rgba(35, 105, 225, .2)",
          }}
        >
          <Plus size={17} />
          Thêm thiết bị
        </button>
      </header>

      {/* Thống kê */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Tổng thiết bị"
          value={stats.total}
          color="#245fb9"
          bg="#edf4ff"
          icon={Cpu}
          active={!filterStatus}
          onClick={() => setFilterStatus("")}
        />

        <StatCard
          label="Hoạt động"
          value={stats.hoat_dong}
          color="#16834b"
          bg="#eaf7ef"
          icon={Check}
          active={filterStatus === "hoat_dong"}
          onClick={() =>
            setFilterStatus(filterStatus === "hoat_dong" ? "" : "hoat_dong")
          }
        />

        <StatCard
          label="Đã tắt"
          value={stats.tat}
          color="#596579"
          bg="#f0f2f5"
          icon={Power}
          active={filterStatus === "tat"}
          onClick={() => setFilterStatus(filterStatus === "tat" ? "" : "tat")}
        />

        <StatCard
          label="Thiết bị hỏng"
          value={stats.hong}
          color="#b94343"
          bg="#fff0ef"
          icon={AlertTriangle}
          active={filterStatus === "hong"}
          onClick={() => setFilterStatus(filterStatus === "hong" ? "" : "hong")}
        />

        <StatCard
          label="Đang sửa"
          value={stats.dang_sua}
          color="#a7640c"
          bg="#fff5e5"
          icon={Wrench}
          active={filterStatus === "dang_sua"}
          onClick={() =>
            setFilterStatus(filterStatus === "dang_sua" ? "" : "dang_sua")
          }
        />
      </section>

      {/* Tìm kiếm, bộ lọc và chế độ xem */}
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm thiết bị hoặc mã phòng..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
            <label className="relative">
              <Cpu
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm font-medium text-gray-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:min-w-44"
              >
                <option value="">Tất cả loại thiết bị</option>
                {types.map((type) => {
                  const knownType = TYPE_MAP[type.name];
                  return (
                    <option key={type.id} value={type.id}>
                      {knownType?.label || type.name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </label>

            <label className="relative">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm font-medium text-gray-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:min-w-44"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(STATUS_MAP).map(([key, status]) => (
                  <option key={key} value={key}>
                    {status.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 xl:justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Xóa bộ lọc
              </button>
            )}

            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Xem dạng bảng"
                className={`rounded-lg p-2 transition-all ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <List size={17} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Xem dạng thẻ"
                className={`rounded-lg p-2 transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Grid2X2 size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span>
            Hiển thị{" "}
            <strong className="text-gray-700">{filteredDevices.length}</strong>{" "}
            trong {devices.length} thiết bị
          </span>

          {filterStatus && (
            <span className="font-medium text-blue-600">
              Đang lọc: {STATUS_MAP[filterStatus]?.label}
            </span>
          )}
        </div>
      </section>

      {/* Nội dung danh sách */}
      {loading ? (
        <section className="flex h-56 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Đang tải danh sách thiết bị...
          </p>
        </section>
      ) : filteredDevices.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-5 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-gray-400">
            <Search size={25} />
          </span>

          <h2 className="mt-4 font-bold text-gray-700">
            Không tìm thấy thiết bị phù hợp
          </h2>

          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Thử đổi từ khóa hoặc xóa bớt bộ lọc để xem thêm thiết bị.
          </p>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50"
            >
              Xóa bộ lọc
            </button>
          )}
        </section>
      ) : viewMode === "table" ? (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {[
                    "Thiết bị",
                    "Loại",
                    "Phòng",
                    "Tòa / Tầng",
                    "Ngày lắp",
                    "Trạng thái",
                    "Thao tác",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="border-b border-gray-100 px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredDevices.map((device) => {
                  const { label, Icon } = getTypeInfo(device);

                  return (
                    <tr
                      key={device.id}
                      className="group border-b border-gray-50 last:border-0 hover:bg-blue-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{
                              color:
                                STATUS_MAP[device.status]?.color || "#64748b",
                              background:
                                STATUS_MAP[device.status]?.bg || "#f1f5f9",
                            }}
                          >
                            <Icon size={18} />
                          </span>

                          <span>
                            <span className="block text-sm font-bold text-gray-800">
                              {device.name}
                            </span>
                            {device.notes && (
                              <span className="mt-0.5 block max-w-56 truncate text-xs text-gray-500">
                                {device.notes}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {label}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          {device.room_code || "--"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="block text-sm font-semibold text-gray-700">
                          {device.building_name ||
                            (device.building_code
                              ? `Tòa ${device.building_code}`
                              : "--")}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {device.floor_number
                            ? `Tầng ${device.floor_number}`
                            : ""}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500">
                        {device.installed_at
                          ? new Date(device.installed_at).toLocaleDateString(
                              "vi-VN",
                            )
                          : "--"}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={device.status}
                          onChange={(event) =>
                            handleStatusChange(device.id, event.target.value)
                          }
                          aria-label={`Trạng thái thiết bị ${device.name}`}
                          className="cursor-pointer appearance-none rounded-full border-0 py-1.5 pl-3 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200"
                          style={{
                            color:
                              STATUS_MAP[device.status]?.color || "#64748b",
                            background:
                              STATUS_MAP[device.status]?.bg || "#f1f5f9",
                          }}
                        >
                          {Object.entries(STATUS_MAP).map(([key, status]) => (
                            <option key={key} value={key}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(device)}
                            title="Chỉnh sửa thiết bị"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(device)}
                            title="Xóa thiết bị"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filteredDevices.map((device) => {
            const { label, Icon } = getTypeInfo(device);
            const status = STATUS_MAP[device.status];

            return (
              <article
                key={device.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-1"
                  style={{ background: status?.dot || "#94a3b8" }}
                />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{
                        color: status?.color || "#64748b",
                        background: status?.bg || "#f1f5f9",
                      }}
                    >
                      <Icon size={21} />
                    </span>
                    <StatusBadge status={device.status} />
                  </div>

                  <h3 className="mt-4 truncate text-base font-black text-gray-800">
                    {device.name}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-blue-600">
                    {device.room_code || "Chưa gán phòng"} · {label}
                  </p>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    <p>
                      Vị trí:{" "}
                      <span className="font-semibold text-gray-700">
                        {device.building_name ||
                          (device.building_code
                            ? `Tòa ${device.building_code}`
                            : "--")}
                        {device.floor_number
                          ? ` · Tầng ${device.floor_number}`
                          : ""}
                      </span>
                    </p>
                    <p>
                      Ngày lắp:{" "}
                      <span className="font-semibold text-gray-700">
                        {device.installed_at
                          ? new Date(device.installed_at).toLocaleDateString(
                              "vi-VN",
                            )
                          : "Chưa cập nhật"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(device)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Edit2 size={13} />
                      Chỉnh sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(device)}
                      aria-label={`Xóa thiết bị ${device.name}`}
                      className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Hộp thoại thêm / sửa thiết bị */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowModal(false);
            }
          }}
        >
          <section className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold text-blue-600">
                  QUẢN LÝ THIẾT BỊ
                </p>
                <h2 className="mt-1 text-lg font-black text-gray-800">
                  {editDevice ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={saving}
                aria-label="Đóng hộp thoại"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Phòng lắp đặt
                </span>
                <select
                  value={form.room_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      room_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  required
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={String(room.id)}>
                      {room.code} — {room.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Loại thiết bị
                  </span>
                  <select
                    value={form.device_type_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        device_type_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    <option value="">Chọn loại thiết bị</option>
                    {types.map((type) => (
                      <option key={type.id} value={String(type.id)}>
                        {TYPE_MAP[type.name]?.label || type.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Trạng thái
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    {Object.entries(STATUS_MAP).map(([key, status]) => (
                      <option key={key} value={key}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Tên thiết bị
                </span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Điều hòa phòng A101"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Ngày lắp đặt
                </span>
                <input
                  type="date"
                  value={form.installed_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      installed_at: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Ghi chú
                </span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Thông tin thêm về thiết bị..."
                  className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #1768e8, #4b8df4)",
                  }}
                >
                  {saving
                    ? "Đang lưu..."
                    : editDevice
                      ? "Lưu thay đổi"
                      : "Tạo thiết bị"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
