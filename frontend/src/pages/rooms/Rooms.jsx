import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  DoorOpen,
  Edit2,
  Filter,
  Grid2X2,
  List,
  Plus,
  Search,
  Trash2,
  Users,
  Wrench,
  X,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

import api from "../../services/api";

const STATUS_MAP = {
  trong: {
    label: "Đang trống",
    color: "#16834b",
    bg: "#eaf7ef",
    dot: "#2bb76e",
  },
  dang_hoc: {
    label: "Đang học",
    color: "#2862bd",
    bg: "#edf4ff",
    dot: "#4d8cf5",
  },
  bao_tri: {
    label: "Đang bảo trì",
    color: "#a7640c",
    bg: "#fff5e5",
    dot: "#eea738",
  },
  su_co: {
    label: "Sự cố",
    color: "#b94343",
    bg: "#fff0ef",
    dot: "#e45d58",
  },
};

const TYPE_MAP = {
  ly_thuyet: { label: "Lý thuyết", icon: BookOpen },
  thuc_hanh: { label: "Thực hành", icon: Grid2X2 },
  hoi_truong: { label: "Hội trường", icon: DoorOpen },
};

const EMPTY_FORM = {
  floor_id: "",
  code: "",
  name: "",
  capacity: 40,
  type: "ly_thuyet",
  status: "trong",
  description: "",
};

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

function StatusBadge({ status }) {
  const value = STATUS_MAP[status] || {
    label: "Chưa rõ",
    color: "#64748b",
    bg: "#f1f5f9",
    dot: "#94a3b8",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
      style={{ color: value.color, background: value.bg }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: value.dot }}
      />
      {value.label}
    </span>
  );
}

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState("table");

  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [modalBuilding, setModalBuilding] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get("/rooms");
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const response = await api.get("/rooms/buildings");
      setBuildings(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách tòa nhà:", error);
    }
  };

  const fetchFloors = async (buildingId) => {
    if (!buildingId) {
      setFloors([]);
      return;
    }

    try {
      const response = await api.get(`/rooms/buildings/${buildingId}/floors`);
      setFloors(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách tầng:", error);
      setFloors([]);
    }
  };

  const handleOpenModal = async (room = null) => {
    setFormError("");

    if (room) {
      setEditRoom(room);

      const buildingId = room.building_id ? String(room.building_id) : "";

      setModalBuilding(buildingId);
      setForm({
        floor_id: room.floor_id ? String(room.floor_id) : "",
        code: room.code || "",
        name: room.name || "",
        capacity: room.capacity ?? 40,
        type: room.type || "ly_thuyet",
        status: room.status || "trong",
        description: room.description || "",
      });

      if (buildingId) {
        await fetchFloors(buildingId);
      } else {
        setFloors([]);
      }
    } else {
      setEditRoom(null);
      setModalBuilding("");
      setForm({ ...EMPTY_FORM });
      setFloors([]);
    }

    setShowModal(true);
  };

  const handleBuildingChange = async (buildingId) => {
    setModalBuilding(buildingId);
    setForm((current) => ({ ...current, floor_id: "" }));
    await fetchFloors(buildingId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.floor_id) {
      setFormError("Vui lòng chọn tầng cho phòng.");
      return;
    }

    if (!form.code.trim() || !form.name.trim()) {
      setFormError("Vui lòng nhập mã phòng và tên phòng.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        floor_id: Number(form.floor_id),
        capacity: Number(form.capacity),
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (editRoom) {
        await api.put(`/rooms/${editRoom.id}`, payload);
      } else {
        await api.post("/rooms", payload);
      }

      setShowModal(false);
      await fetchRooms();
    } catch (error) {
      setFormError(
        error.response?.data?.message || "Không thể lưu thông tin phòng.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (room) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa phòng ${room.code} không?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/rooms/${room.id}`);
      await fetchRooms();
    } catch (error) {
      window.alert(error.response?.data?.message || "Không thể xóa phòng này.");
    }
  };

  const handleStatusChange = async (roomId, status) => {
    try {
      await api.patch(`/rooms/${roomId}/status`, { status });
      await fetchRooms();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    }
  };

  const filteredRooms = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !query ||
        room.code?.toLowerCase().includes(query) ||
        room.name?.toLowerCase().includes(query);

      const matchesBuilding =
        !filterBuilding || room.building_code === filterBuilding;

      const matchesStatus = !filterStatus || room.status === filterStatus;

      const matchesType = !filterType || room.type === filterType;

      return matchesSearch && matchesBuilding && matchesStatus && matchesType;
    });
  }, [rooms, search, filterBuilding, filterStatus, filterType]);

  const stats = {
    total: rooms.length,
    trong: rooms.filter((room) => room.status === "trong").length,
    dang_hoc: rooms.filter((room) => room.status === "dang_hoc").length,
    bao_tri: rooms.filter((room) => room.status === "bao_tri").length,
    su_co: rooms.filter((room) => room.status === "su_co").length,
  };

  const clearFilters = () => {
    setSearch("");
    setFilterBuilding("");
    setFilterStatus("");
    setFilterType("");
  };

  const hasActiveFilters =
    search || filterBuilding || filterStatus || filterType;

  return (
    <div className="space-y-5">
      {/* Tiêu đề trang */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
            <Building2 size={14} />
            QUẢN LÝ CƠ SỞ VẬT CHẤT
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Phòng học
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Theo dõi trạng thái và thông tin các phòng trong hệ thống.
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
          Thêm phòng
        </button>
      </header>

      {/* Thẻ thống kê */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Tổng số phòng"
          value={stats.total}
          color="#245fb9"
          bg="#edf4ff"
          icon={Building2}
          active={!filterStatus}
          onClick={() => setFilterStatus("")}
        />

        <StatCard
          label="Đang trống"
          value={stats.trong}
          color="#16834b"
          bg="#eaf7ef"
          icon={DoorOpen}
          active={filterStatus === "trong"}
          onClick={() =>
            setFilterStatus(filterStatus === "trong" ? "" : "trong")
          }
        />

        <StatCard
          label="Đang học"
          value={stats.dang_hoc}
          color="#2862bd"
          bg="#edf4ff"
          icon={Users}
          active={filterStatus === "dang_hoc"}
          onClick={() =>
            setFilterStatus(filterStatus === "dang_hoc" ? "" : "dang_hoc")
          }
        />

        <StatCard
          label="Đang bảo trì"
          value={stats.bao_tri}
          color="#a7640c"
          bg="#fff5e5"
          icon={Wrench}
          active={filterStatus === "bao_tri"}
          onClick={() =>
            setFilterStatus(filterStatus === "bao_tri" ? "" : "bao_tri")
          }
        />

        <StatCard
          label="Sự cố"
          value={stats.su_co}
          color="#b94343"
          bg="#fff0ef"
          icon={AlertTriangle}
          active={filterStatus === "su_co"}
          onClick={() =>
            setFilterStatus(filterStatus === "su_co" ? "" : "su_co")
          }
        />
      </section>

      {/* Tìm kiếm và bộ lọc */}
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
              placeholder="Tìm theo mã hoặc tên phòng..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex">
            <label className="relative">
              <Building2
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterBuilding}
                onChange={(event) => setFilterBuilding(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm font-medium text-gray-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:min-w-40"
              >
                <option value="">Tất cả tòa</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.code}>
                    {building.name}
                  </option>
                ))}
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

            <label className="relative">
              <Grid2X2
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm font-medium text-gray-600 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 xl:min-w-40"
              >
                <option value="">Tất cả loại phòng</option>
                {Object.entries(TYPE_MAP).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.label}
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
            <strong className="text-gray-700">{filteredRooms.length}</strong>{" "}
            trong {rooms.length} phòng
          </span>
          {filterStatus && (
            <span className="font-medium text-blue-600">
              Đang lọc: {STATUS_MAP[filterStatus]?.label}
            </span>
          )}
        </div>
      </section>

      {/* Danh sách phòng */}
      {loading ? (
        <section className="flex h-56 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-3 text-sm font-medium text-gray-500">
            Đang tải danh sách phòng...
          </p>
        </section>
      ) : filteredRooms.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-5 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-gray-400">
            <Search size={25} />
          </span>
          <h2 className="mt-4 font-bold text-gray-700">
            Không tìm thấy phòng phù hợp
          </h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Thử đổi từ khóa hoặc xóa bớt bộ lọc để xem thêm phòng.
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
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {[
                    "Phòng",
                    "Tòa / Tầng",
                    "Loại phòng",
                    "Sức chứa",
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
                {filteredRooms.map((room) => {
                  const type = TYPE_MAP[room.type];
                  const TypeIcon = type?.icon || DoorOpen;

                  return (
                    <tr
                      key={room.id}
                      className="group border-b border-gray-50 last:border-0 hover:bg-blue-50/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Building2 size={17} />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-gray-800">
                              {room.code}
                            </span>
                            <span className="mt-0.5 block text-xs text-gray-500">
                              {room.name}
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="block text-sm font-semibold text-gray-700">
                          {room.building_name || `Tòa ${room.building_code}`}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Tầng {room.floor_number}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                          <TypeIcon size={15} className="text-gray-400" />
                          {type?.label || "Chưa phân loại"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600">
                          <Users size={14} className="text-gray-400" />
                          {room.capacity}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={room.status}
                          onChange={(event) =>
                            handleStatusChange(room.id, event.target.value)
                          }
                          aria-label={`Trạng thái phòng ${room.code}`}
                          className="cursor-pointer appearance-none rounded-full border-0 py-1.5 pl-3 pr-3 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-200"
                          style={{
                            color: STATUS_MAP[room.status]?.color || "#64748b",
                            background:
                              STATUS_MAP[room.status]?.bg || "#f1f5f9",
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
                            onClick={() => handleOpenModal(room)}
                            title="Chỉnh sửa phòng"
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(room)}
                            title="Xóa phòng"
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
          {filteredRooms.map((room) => {
            const type = TYPE_MAP[room.type];
            const TypeIcon = type?.icon || DoorOpen;
            const status = STATUS_MAP[room.status];

            return (
              <article
                key={room.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-1"
                  style={{ background: status?.dot || "#94a3b8" }}
                />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-black tracking-tight text-gray-800">
                        {room.code}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{room.name}</p>
                    </div>
                    <StatusBadge status={room.status} />
                  </div>

                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                    <p className="flex items-center gap-2 text-xs text-gray-600">
                      <Building2 size={14} className="text-gray-400" />
                      {room.building_name || `Tòa ${room.building_code}`} · Tầng{" "}
                      {room.floor_number}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-600">
                      <TypeIcon size={14} className="text-gray-400" />
                      {type?.label || "Chưa phân loại"}
                    </p>
                    <p className="flex items-center gap-2 text-xs text-gray-600">
                      <Users size={14} className="text-gray-400" />
                      Sức chứa {room.capacity} người
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(room)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-2 text-xs font-bold text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Edit2 size={13} />
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(room)}
                      className="flex items-center justify-center rounded-lg bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100"
                      aria-label={`Xóa phòng ${room.code}`}
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

      {/* Hộp thoại thêm / sửa */}
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
                  QUẢN LÝ PHÒNG HỌC
                </p>
                <h2 className="mt-1 text-lg font-black text-gray-800">
                  {editRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Tòa nhà
                  </span>
                  <select
                    value={modalBuilding}
                    onChange={(event) =>
                      handleBuildingChange(event.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  >
                    <option value="">Chọn tòa nhà</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={String(building.id)}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Tầng
                  </span>
                  <select
                    value={form.floor_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        floor_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                    disabled={!modalBuilding}
                  >
                    <option value="">Chọn tầng</option>
                    {floors.map((floor) => (
                      <option key={floor.id} value={String(floor.id)}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Mã phòng
                  </span>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="Ví dụ: A101"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Tên phòng
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
                    placeholder="Ví dụ: Phòng học A101"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Sức chứa
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        capacity: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Loại phòng
                  </span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  >
                    {Object.entries(TYPE_MAP).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Mô tả
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Thông tin thêm về phòng..."
                  className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-gray-700">
                  Trạng thái ban đầu
                </legend>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(STATUS_MAP).map(([key, status]) => {
                    const active = form.status === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            status: key,
                          }))
                        }
                        className="rounded-xl border px-2 py-2 text-xs font-bold transition-colors"
                        style={{
                          color: active ? status.color : "#64748b",
                          background: active ? status.bg : "white",
                          borderColor: active ? status.color : "#e5e7eb",
                        }}
                      >
                        {active && <Check size={12} className="mr-1 inline" />}
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

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
                    : editRoom
                      ? "Lưu thay đổi"
                      : "Tạo phòng"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
