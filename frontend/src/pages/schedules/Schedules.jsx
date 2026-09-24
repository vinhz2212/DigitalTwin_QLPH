import { useState, useEffect } from "react";
import api from "../../services/api";
import { Plus, Edit, Trash2, Calendar, List } from "lucide-react";

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const DAY_LABELS = {
  T2: "Thứ 2",
  T3: "Thứ 3",
  T4: "Thứ 4",
  T5: "Thứ 5",
  T6: "Thứ 6",
  T7: "Thứ 7",
  CN: "Chủ nhật",
};

const COLORS = [
  { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8", dot: "#3b82f6" },
  { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", dot: "#22c55e" },
  { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
  { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", dot: "#ef4444" },
  { bg: "#f0fdfa", border: "#99f6e4", text: "#0f766e", dot: "#14b8a6" },
  { bg: "#fefce8", border: "#fef08a", text: "#a16207", dot: "#eab308" },
  { bg: "#fff1f2", border: "#fecdd3", text: "#be123c", dot: "#f43f5e" },
];

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [viewMode, setViewMode] = useState("week");
  const [form, setForm] = useState({
    room_id: "",
    subject: "",
    instructor: "",
    day_of_week: "T2",
    start_time: "07:00",
    end_time: "09:00",
    semester: "2024-1",
  });

  useEffect(() => {
    fetchSchedules();
    fetchRooms();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await api.get("/schedules");
      setSchedules(res.data);
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

  const handleOpenModal = (schedule = null) => {
    if (schedule) {
      setEditSchedule(schedule);
      setForm({
        room_id: schedule.room_id,
        subject: schedule.subject,
        instructor: schedule.instructor || "",
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time?.slice(0, 5),
        end_time: schedule.end_time?.slice(0, 5),
        semester: schedule.semester || "2024-1",
      });
    } else {
      setEditSchedule(null);
      setForm({
        room_id: "",
        subject: "",
        instructor: "",
        day_of_week: "T2",
        start_time: "07:00",
        end_time: "09:00",
        semester: "2024-1",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSchedule) {
        await api.put(`/schedules/${editSchedule.id}`, form);
      } else {
        await api.post("/schedules", form);
      }
      setShowModal(false);
      fetchSchedules();
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa lịch học này?")) return;
    await api.delete(`/schedules/${id}`);
    fetchSchedules();
  };

  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.day_of_week === day);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Lịch học</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {schedules.length} lịch học trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "week"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-400"
              }`}
            >
              <Calendar size={14} /> Tuần
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white shadow text-blue-600"
                  : "text-gray-400"
              }`}
            >
              <List size={14} /> Danh sách
            </button>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #1a56db, #3b82f6)",
              boxShadow: "0 4px 15px rgba(26,86,219,0.35)",
            }}
          >
            <Plus size={16} /> Thêm lịch học
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day, i) => {
          const count = byDay[day].length;
          return (
            <div
              key={day}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center hover:shadow-md transition-all"
            >
              <p className="text-xs font-bold text-gray-400 uppercase">{day}</p>
              <p
                className="text-2xl font-black mt-1"
                style={{ color: count > 0 ? "#1a56db" : "#d1d5db" }}
              >
                {count}
              </p>
              <p className="text-xs text-gray-400">lịch</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Đang tải...</p>
          </div>
        </div>
      ) : viewMode === "week" ? (
        /* Week View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day headers */}
          <div
            className="grid grid-cols-7 border-b border-gray-100"
            style={{ background: "linear-gradient(135deg, #f8fafc, #eff6ff)" }}
          >
            {DAYS.map((day) => (
              <div
                key={day}
                className="px-3 py-3 text-center border-r border-gray-100 last:border-r-0"
              >
                <p className="text-xs font-black text-gray-600 uppercase tracking-wider">
                  {DAY_LABELS[day]}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {byDay[day].length} lịch
                </p>
              </div>
            ))}
          </div>

          {/* Schedule grid */}
          <div className="grid grid-cols-7 min-h-64 p-2 gap-1">
            {DAYS.map((day, di) => (
              <div
                key={day}
                className={`space-y-1.5 px-1 ${di < 6 ? "border-r border-gray-50" : ""}`}
              >
                {byDay[day].length === 0 ? (
                  <div className="text-center text-xs text-gray-200 mt-6 select-none">
                    Trống
                  </div>
                ) : (
                  byDay[day].map((s, i) => {
                    const colorScheme = COLORS[i % COLORS.length];
                    return (
                      <div
                        key={s.id}
                        className="rounded-xl p-2.5 cursor-pointer hover:shadow-md transition-all border"
                        style={{
                          background: colorScheme.bg,
                          borderColor: colorScheme.border,
                        }}
                        onClick={() => handleOpenModal(s)}
                      >
                        <p
                          className="text-xs font-black truncate"
                          style={{ color: colorScheme.text }}
                        >
                          {s.subject}
                        </p>
                        <p
                          className="text-xs mt-1 font-medium"
                          style={{ color: colorScheme.dot }}
                        >
                          {s.start_time?.slice(0, 5)} -{" "}
                          {s.end_time?.slice(0, 5)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <div
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: colorScheme.dot }}
                          />
                          <p className="text-xs text-gray-400 truncate">
                            {s.room_code}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #f8fafc, #eff6ff)",
                }}
              >
                {[
                  "Môn học",
                  "Giảng viên",
                  "Phòng",
                  "Thứ",
                  "Giờ học",
                  "Học kỳ",
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
              {schedules.map((s, i) => {
                const colorScheme = COLORS[i % COLORS.length];
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-blue-50/20 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: colorScheme.dot }}
                        />
                        <span className="text-sm font-bold text-gray-800">
                          {s.subject}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {s.instructor || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-black text-blue-600">
                        {s.room_code}
                      </span>
                      <p className="text-xs text-gray-400">
                        {s.building_name} / T{s.floor_number}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: colorScheme.bg,
                          color: colorScheme.text,
                          border: `1px solid ${colorScheme.border}`,
                        }}
                      >
                        {DAY_LABELS[s.day_of_week]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-600">
                      {s.start_time?.slice(0, 5)} — {s.end_time?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-600">
                        {s.semester}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-100 transition-all"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
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
          {schedules.length === 0 && (
            <div className="text-center py-16 text-gray-300">
              <Calendar size={48} className="mx-auto mb-3" />
              <p className="text-sm">Chưa có lịch học nào</p>
            </div>
          )}
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
                  {editSchedule
                    ? "✏️ Chỉnh sửa lịch học"
                    : "📅 Thêm lịch học mới"}
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
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Môn học
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="VD: Lập trình Web"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Giảng viên
                </label>
                <input
                  type="text"
                  value={form.instructor}
                  onChange={(e) =>
                    setForm({ ...form, instructor: e.target.value })
                  }
                  placeholder="VD: TS. Nguyễn Văn A"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Thứ trong tuần
                </label>
                <div className="flex gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, day_of_week: d })}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border-2"
                      style={{
                        background:
                          form.day_of_week === d ? "#1a56db" : "white",
                        color: form.day_of_week === d ? "white" : "#9ca3af",
                        borderColor:
                          form.day_of_week === d ? "#1a56db" : "#e5e7eb",
                        boxShadow:
                          form.day_of_week === d
                            ? "0 4px 12px rgba(26,86,219,0.3)"
                            : "none",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Học kỳ
                  </label>
                  <input
                    type="text"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                    placeholder="2024-1"
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                </div>
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
                  {editSchedule ? "💾 Cập nhật" : "📅 Thêm lịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
