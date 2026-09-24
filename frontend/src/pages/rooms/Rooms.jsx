import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building2,
  Grid3X3,
  List,
} from "lucide-react";

const STATUS_MAP = {
  trong: { label: "Đang trống", color: "#22c55e", bg: "#f0fdf4" },
  dang_hoc: { label: "Đang học", color: "#3b82f6", bg: "#eff6ff" },
  bao_tri: { label: "Đang bảo trì", color: "#f59e0b", bg: "#fffbeb" },
  su_co: { label: "Sự cố", color: "#ef4444", bg: "#fef2f2" },
};

const TYPE_MAP = {
  ly_thuyet: { label: "Lý thuyết", icon: "📖" },
  thuc_hanh: { label: "Thực hành", icon: "💻" },
  hoi_truong: { label: "Hội trường", icon: "🎭" },
};

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState({
    floor_id: "",
    code: "",
    name: "",
    capacity: 40,
    type: "ly_thuyet",
    status: "trong",
    description: "",
  });

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuildings = async () => {
    try {
      const res = await api.get("/rooms/buildings");
      setBuildings(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchFloors = async (buildingId) => {
    try {
      const res = await api.get(`/rooms/buildings/${buildingId}/floors`);
      setFloors(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = (room = null) => {
    if (room) {
      setEditRoom(room);
      setForm({
        floor_id: room.floor_id,
        code: room.code,
        name: room.name,
        capacity: room.capacity,
        type: room.type,
        status: room.status,
        description: room.description || "",
      });
      fetchFloors(room.building_id);
    } else {
      setEditRoom(null);
      setForm({
        floor_id: "",
        code: "",
        name: "",
        capacity: 40,
        type: "ly_thuyet",
        status: "trong",
        description: "",
      });
      setFloors([]);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editRoom) {
        await api.put(`/rooms/${editRoom.id}`, form);
      } else {
        await api.post("/rooms", form);
      }
      setShowModal(false);
      fetchRooms();
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phòng này?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (error) {
      alert("Không thể xóa phòng này!");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/rooms/${id}/status`, { status });
      fetchRooms();
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = rooms.filter((r) => {
    const matchSearch =
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase());
    const matchBuilding = filterBuilding
      ? r.building_code === filterBuilding
      : true;
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    const matchType = filterType ? r.type === filterType : true;
    return matchSearch && matchBuilding && matchStatus && matchType;
  });

  const stats = {
    total: rooms.length,
    trong: rooms.filter((r) => r.status === "trong").length,
    dang_hoc: rooms.filter((r) => r.status === "dang_hoc").length,
    bao_tri: rooms.filter((r) => r.status === "bao_tri").length,
    su_co: rooms.filter((r) => r.status === "su_co").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Quản lý Phòng học
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {rooms.length} phòng học trong hệ thống
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #1a56db, #3b82f6)",
            boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
          }}
        >
          <Plus size={16} /> Thêm phòng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: "Tổng phòng",
            value: stats.total,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🏫",
          },
          {
            label: "Đang trống",
            value: stats.trong,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "✅",
          },
          {
            label: "Đang học",
            value: stats.dang_hoc,
            color: "#3b82f6",
            bg: "#dbeafe",
            icon: "📚",
          },
          {
            label: "Bảo trì",
            value: stats.bao_tri,
            color: "#f59e0b",
            bg: "#fef9c3",
            icon: "🔧",
          },
          {
            label: "Sự cố",
            value: stats.su_co,
            color: "#ef4444",
            bg: "#fee2e2",
            icon: "⚠️",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all cursor-pointer"
            onClick={() =>
              setFilterStatus(i === 0 ? "" : Object.keys(STATUS_MAP)[i - 1])
            }
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

      {/* Filter + View toggle */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          {/* Filter tòa */}
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-medium"
          >
            <option value="">🏢 Tất cả tòa</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Filter status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-medium"
          >
            <option value="">📊 Tất cả trạng thái</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Filter type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-medium"
          >
            <option value="">🗂️ Tất cả loại</option>
            {Object.entries(TYPE_MAP).map(([k, v]) => (
              <option key={k} value={k}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>

          {/* View mode */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl ml-auto">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-all ${viewMode === "table" ? "bg-white shadow text-blue-600" : "text-gray-400"}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow text-blue-600" : "text-gray-400"}`}
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* Table View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                {[
                  "Mã phòng",
                  "Tên phòng",
                  "Tòa / Tầng",
                  "Loại phòng",
                  "Sức chứa",
                  "Trạng thái",
                  "Thao tác",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider border-b border-gray-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((room) => {
                const status = STATUS_MAP[room.status];
                const type = TYPE_MAP[room.type];
                return (
                  <tr
                    key={room.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 font-black text-blue-600 text-sm">
                        <Building2 size={14} />
                        {room.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                      {room.name}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          {room.building_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Tầng {room.floor_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {type?.icon} {type?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-600">
                        👥 {room.capacity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={room.status}
                        onChange={(e) =>
                          handleStatusChange(room.id, e.target.value)
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer transition-all"
                        style={{ color: status?.color, background: status?.bg }}
                      >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleOpenModal(room)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-all"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <Building2 size={48} className="mx-auto mb-3" />
              <p className="text-sm">Không tìm thấy phòng nào</p>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((room) => {
            const status = STATUS_MAP[room.status];
            const type = TYPE_MAP[room.type];
            return (
              <div
                key={room.id}
                className="bg-white rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all group cursor-pointer"
                style={{ borderColor: status?.bg }}
              >
                {/* Status indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{
                      background: status?.color,
                      animationPlayState:
                        room.status === "su_co" ? "running" : "paused",
                    }}
                  />
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ color: status?.color, background: status?.bg }}
                  >
                    {status?.label}
                  </span>
                </div>

                {/* Room code */}
                <p className="text-2xl font-black text-gray-800 mb-1">
                  {room.code}
                </p>
                <p className="text-xs text-gray-400 mb-3">{room.name}</p>

                {/* Info */}
                <div className="space-y-1 text-xs text-gray-500">
                  <p>
                    🏢 {room.building_name} / Tầng {room.floor_number}
                  </p>
                  <p>
                    {type?.icon} {type?.label}
                  </p>
                  <p>👥 {room.capacity} chỗ</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleOpenModal(room)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(room.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div
              className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
              }}
            >
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  {editRoom ? "✏️ Chỉnh sửa phòng" : "➕ Thêm phòng mới"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Điền đầy đủ thông tin bên dưới
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Tòa nhà */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Tòa nhà
                </label>
                <select
                  onChange={(e) => fetchFloors(e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                >
                  <option value="">Chọn tòa nhà</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tầng */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Tầng
                </label>
                <select
                  value={form.floor_id}
                  onChange={(e) =>
                    setForm({ ...form, floor_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                >
                  <option value="">Chọn tầng</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã + Tên */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Mã phòng
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="VD: A101"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Tên phòng
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Phòng A101"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
              </div>

              {/* Sức chứa + Loại */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Sức chứa
                  </label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Loại phòng
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  >
                    {Object.entries(TYPE_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.icon} {v.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Trạng thái
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm({ ...form, status: k })}
                      className="py-2 rounded-xl text-xs font-bold transition-all border-2"
                      style={{
                        background: form.status === k ? v.bg : "white",
                        color: form.status === k ? v.color : "#9ca3af",
                        borderColor: form.status === k ? v.color : "#e5e7eb",
                      }}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                    boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
                  }}
                >
                  {editRoom ? "💾 Cập nhật" : "➕ Thêm phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
