import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Calendar,
} from "lucide-react";

const STATUS_MAP = {
  cho_duyet: {
    label: "Chờ duyệt",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "⏳",
  },
  da_duyet: { label: "Đã duyệt", color: "#22c55e", bg: "#f0fdf4", icon: "✅" },
  tu_choi: { label: "Từ chối", color: "#ef4444", bg: "#fef2f2", icon: "❌" },
  da_huy: { label: "Đã hủy", color: "#6b7280", bg: "#f9fafb", icon: "🚫" },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({});
  const [form, setForm] = useState({
    room_id: "",
    date: "",
    start_time: "",
    end_time: "",
    purpose: "",
    note: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [bookingsRes, roomsRes, statsRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/rooms"),
        api.get("/bookings/stats"),
      ]);
      setBookings(bookingsRes.data);
      setRooms(roomsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/bookings", form);
      setShowModal(false);
      setForm({
        room_id: "",
        date: "",
        start_time: "",
        end_time: "",
        purpose: "",
        note: "",
      });
      fetchAll();
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa đặt phòng này?")) return;
    await api.delete(`/bookings/${id}`);
    fetchAll();
  };

  const filtered = bookings.filter((b) => {
    const matchStatus = filterStatus ? b.status === filterStatus : true;
    const matchSearch = search
      ? b.room_code?.toLowerCase().includes(search.toLowerCase()) ||
        b.user_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.purpose?.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">
            Lịch sử đặt phòng
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Quản lý các yêu cầu đặt phòng học
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #1a56db, #3b82f6)",
            boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
          }}
        >
          <Plus size={16} /> Đặt phòng
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Tổng đặt phòng",
            value: stats.total || 0,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "📋",
          },
          {
            label: "Chờ duyệt",
            value: stats.pending || 0,
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: "⏳",
          },
          {
            label: "Đã duyệt",
            value: stats.approved || 0,
            color: "#22c55e",
            bg: "#f0fdf4",
            icon: "✅",
          },
          {
            label: "Từ chối",
            value: stats.rejected || 0,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "❌",
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
              placeholder="Tìm kiếm phòng, người đặt, mục đích..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus("")}
              className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2"
              style={{
                background: filterStatus === "" ? "#eff6ff" : "white",
                color: filterStatus === "" ? "#1a56db" : "#6b7280",
                borderColor: filterStatus === "" ? "#1a56db" : "#e5e7eb",
              }}
            >
              Tất cả
            </button>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilterStatus(k)}
                className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all border-2"
                style={{
                  background: filterStatus === k ? v.bg : "white",
                  color: filterStatus === k ? v.color : "#6b7280",
                  borderColor: filterStatus === k ? v.color : "#e5e7eb",
                }}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                {[
                  "Phòng",
                  "Người đặt",
                  "Ngày & Giờ",
                  "Mục đích",
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
              {filtered.map((b) => {
                const status = STATUS_MAP[b.status];
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm"
                          style={{
                            background:
                              "linear-gradient(135deg, #1a56db, #3b82f6)",
                          }}
                        >
                          {b.room_code?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-blue-600">
                            {b.room_code}
                          </p>
                          <p className="text-xs text-gray-400">
                            {b.building_name} / T{b.floor_number}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-700">
                        {b.user_name}
                      </p>
                      <p className="text-xs text-gray-400">{b.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-bold text-gray-700">
                            {new Date(b.date).toLocaleDateString("vi-VN")}
                          </p>
                          <p className="text-xs text-gray-400">
                            {b.start_time?.slice(0, 5)} —{" "}
                            {b.end_time?.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500 max-w-32 truncate">
                        {b.purpose || "--"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ color: status?.color, background: status?.bg }}
                      >
                        {status?.icon} {status?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {b.status === "cho_duyet" && (
                          <>
                            <button
                              onClick={() => handleStatus(b.id, "da_duyet")}
                              className="p-2 rounded-lg text-green-500 hover:bg-green-100 transition-all"
                              title="Duyệt"
                            >
                              <CheckCircle size={15} />
                            </button>
                            <button
                              onClick={() => handleStatus(b.id, "tu_choi")}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-all"
                              title="Từ chối"
                            >
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {b.status === "da_duyet" && (
                          <button
                            onClick={() => handleStatus(b.id, "da_huy")}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-all"
                            title="Hủy"
                          >
                            <Clock size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-100 transition-all"
                          title="Xóa"
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
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-200">
            <Calendar size={56} className="mx-auto mb-4" />
            <p className="text-base font-bold text-gray-300">
              Chưa có đặt phòng nào
            </p>
            <p className="text-sm text-gray-200 mt-1">
              Click "Đặt phòng" để tạo yêu cầu mới
            </p>
          </div>
        )}
      </div>

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
                  📅 Đặt phòng mới
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
                  Phòng học
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
                  {rooms
                    .filter((r) => r.status === "trong")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} — {r.name} ({r.capacity} chỗ)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Ngày đặt
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Giờ bắt đầu
                  </label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) =>
                      setForm({ ...form, start_time: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Giờ kết thúc
                  </label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) =>
                      setForm({ ...form, end_time: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Mục đích
                </label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                  placeholder="VD: Họp nhóm, Giảng dạy, Seminar..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  placeholder="Ghi chú thêm nếu có..."
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
                  📅 Đặt phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
