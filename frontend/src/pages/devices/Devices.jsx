import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Power,
  Grid3X3,
  List,
  Cpu,
} from "lucide-react";

const STATUS_MAP = {
  hoat_dong: { label: "Hoạt động", color: "#22c55e", bg: "#f0fdf4" },
  tat: { label: "Đã tắt", color: "#6b7280", bg: "#f9fafb" },
  hong: { label: "Hỏng", color: "#ef4444", bg: "#fef2f2" },
  dang_sua: { label: "Đang sửa", color: "#f59e0b", bg: "#fffbeb" },
};

const ICON_MAP = {
  den: { icon: "💡", label: "Đèn" },
  dieu_hoa: { icon: "❄️", label: "Điều hòa" },
  may_chieu: { icon: "📽️", label: "Máy chiếu" },
  quat: { icon: "🌀", label: "Quạt" },
  loa: { icon: "🔊", label: "Loa" },
  may_tinh: { icon: "💻", label: "Máy tính" },
};

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [form, setForm] = useState({
    room_id: "",
    device_type_id: "",
    name: "",
    status: "tat",
    installed_at: "",
    notes: "",
  });

  useEffect(() => {
    fetchDevices();
    fetchRooms();
    fetchTypes();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get("/devices");
      setDevices(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await api.get("/devices/types");
      setTypes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenModal = (device = null) => {
    if (device) {
      setEditDevice(device);
      setForm({
        room_id: device.room_id,
        device_type_id: device.device_type_id,
        name: device.name,
        status: device.status,
        installed_at: device.installed_at?.split("T")[0] || "",
        notes: device.notes || "",
      });
    } else {
      setEditDevice(null);
      setForm({
        room_id: "",
        device_type_id: "",
        name: "",
        status: "tat",
        installed_at: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDevice) {
        await api.put(`/devices/${editDevice.id}`, form);
      } else {
        await api.post("/devices", form);
      }
      setShowModal(false);
      fetchDevices();
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thiết bị này?")) return;
    try {
      await api.delete(`/devices/${id}`);
      fetchDevices();
    } catch (error) {
      alert("Không thể xóa thiết bị này!");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/devices/${id}/status`, { status });
      fetchDevices();
    } catch (error) {
      console.error(error);
    }
  };

  const filtered = devices.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.room_code?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType ? d.device_type_id == filterType : true;
    const matchStatus = filterStatus ? d.status === filterStatus : true;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: devices.length,
    hoat_dong: devices.filter((d) => d.status === "hoat_dong").length,
    tat: devices.filter((d) => d.status === "tat").length,
    hong: devices.filter((d) => d.status === "hong").length,
    dang_sua: devices.filter((d) => d.status === "dang_sua").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Quản lý Thiết bị
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {devices.length} thiết bị trong hệ thống
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
          <Plus size={16} /> Thêm thiết bị
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: "Tổng thiết bị",
            value: stats.total,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "🖥️",
          },
          {
            label: "Hoạt động",
            value: stats.hoat_dong,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "✅",
          },
          {
            label: "Đã tắt",
            value: stats.tat,
            color: "#6b7280",
            bg: "#f9fafb",
            icon: "⭕",
          },
          {
            label: "Hỏng",
            value: stats.hong,
            color: "#ef4444",
            bg: "#fee2e2",
            icon: "❌",
          },
          {
            label: "Đang sửa",
            value: stats.dang_sua,
            color: "#f59e0b",
            bg: "#fef9c3",
            icon: "🔧",
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

      {/* Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Tìm kiếm thiết bị, phòng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 font-medium"
          >
            <option value="">🔌 Tất cả loại</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {ICON_MAP[t.name]?.icon} {ICON_MAP[t.name]?.label || t.name}
              </option>
            ))}
          </select>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                {[
                  "Thiết bị",
                  "Loại",
                  "Phòng",
                  "Tòa / Tầng",
                  "Ngày lắp",
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
              {filtered.map((device) => {
                const status = STATUS_MAP[device.status];
                const typeInfo = ICON_MAP[device.type_name];
                return (
                  <tr
                    key={device.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: status?.bg }}
                        >
                          {typeInfo?.icon || "🔧"}
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {device.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {typeInfo?.label || device.type_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-black text-blue-600">
                        {device.room_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {device.building_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Tầng {device.floor_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {device.installed_at
                        ? new Date(device.installed_at).toLocaleDateString(
                            "vi-VN",
                          )
                        : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={device.status}
                        onChange={(e) =>
                          handleStatusChange(device.id, e.target.value)
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer"
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
                          onClick={() => handleOpenModal(device)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(device.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-all"
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
              <Cpu size={48} className="mx-auto mb-3" />
              <p className="text-sm">Không tìm thấy thiết bị nào</p>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {filtered.map((device) => {
            const status = STATUS_MAP[device.status];
            const typeInfo = ICON_MAP[device.type_name];
            return (
              <div
                key={device.id}
                className="bg-white rounded-xl p-4 shadow-sm border-2 hover:shadow-md transition-all group cursor-pointer"
                style={{ borderColor: status?.bg }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: status?.bg }}
                  >
                    {typeInfo?.icon || "🔧"}
                  </div>
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: status?.color }}
                  />
                </div>
                <p className="text-sm font-black text-gray-800 truncate mb-1">
                  {device.name}
                </p>
                <p className="text-xs text-blue-600 font-bold mb-1">
                  {device.room_code}
                </p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: status?.color, background: status?.bg }}
                >
                  {status?.label}
                </span>
                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleOpenModal(device)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(device.id)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100"
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
                  {editDevice
                    ? "✏️ Chỉnh sửa thiết bị"
                    : "➕ Thêm thiết bị mới"}
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
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Phòng
                </label>
                <select
                  value={form.room_id}
                  onChange={(e) =>
                    setForm({ ...form, room_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Loại thiết bị
                </label>
                <select
                  value={form.device_type_id}
                  onChange={(e) =>
                    setForm({ ...form, device_type_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                >
                  <option value="">Chọn loại thiết bị</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {ICON_MAP[t.name]?.icon}{" "}
                      {ICON_MAP[t.name]?.label || t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Tên thiết bị
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="VD: Đèn phòng A101"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Trạng thái
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Ngày lắp đặt
                  </label>
                  <input
                    type="date"
                    value={form.installed_at}
                    onChange={(e) =>
                      setForm({ ...form, installed_at: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                />
              </div>
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
                  {editDevice ? "💾 Cập nhật" : "➕ Thêm thiết bị"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
