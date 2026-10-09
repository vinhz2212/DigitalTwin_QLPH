import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit2,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

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

const EMPTY_FORM = {
  room_id: "",
  subject: "",
  instructor: "",
  day_of_week: "T2",
  start_time: "07:00",
  end_time: "09:00",
  semester: "",
};

const getColor = (index) => COLORS[index % COLORS.length];

const getTime = (value) => (value ? String(value).slice(0, 5) : "--:--");

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [viewMode, setViewMode] = useState("week");
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.get("/schedules");
      setSchedules(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải lịch học:", error);
      setLoadError(
        error.response?.data?.message ||
          "Không thể tải lịch học. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Không thể tải danh sách phòng:", error);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchRooms();
  }, [fetchSchedules, fetchRooms]);

  const filteredSchedules = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return schedules
      .filter((schedule) => {
        const matchesDay = !selectedDay || schedule.day_of_week === selectedDay;

        const searchableText = [
          schedule.subject,
          schedule.instructor,
          schedule.room_code,
          schedule.building_name,
          schedule.semester,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("vi");

        return matchesDay && (!keyword || searchableText.includes(keyword));
      })
      .sort((a, b) => {
        const dayOrder =
          DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week);

        if (dayOrder !== 0) return dayOrder;
        return getTime(a.start_time).localeCompare(getTime(b.start_time));
      });
  }, [schedules, search, selectedDay]);

  const schedulesByDay = useMemo(
    () =>
      DAYS.reduce((result, day) => {
        result[day] = filteredSchedules.filter(
          (schedule) => schedule.day_of_week === day,
        );
        return result;
      }, {}),
    [filteredSchedules],
  );

  const openModal = (schedule = null) => {
    setFormError("");

    if (schedule) {
      setEditSchedule(schedule);
      setForm({
        room_id: String(schedule.room_id ?? ""),
        subject: schedule.subject ?? "",
        instructor: schedule.instructor ?? "",
        day_of_week: schedule.day_of_week ?? "T2",
        start_time: getTime(schedule.start_time),
        end_time: getTime(schedule.end_time),
        semester: schedule.semester ?? "",
      });
    } else {
      setEditSchedule(null);
      setForm(EMPTY_FORM);
    }

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditSchedule(null);
    setForm(EMPTY_FORM);
    setFormError("");
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (form.start_time >= form.end_time) {
      setFormError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        room_id: Number(form.room_id),
        subject: form.subject.trim(),
        instructor: form.instructor.trim(),
        semester: form.semester.trim(),
      };

      if (editSchedule) {
        await api.put(`/schedules/${editSchedule.id}`, payload);
      } else {
        await api.post("/schedules", payload);
      }

      setShowModal(false);
      setEditSchedule(null);
      setForm(EMPTY_FORM);
      await fetchSchedules();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể lưu lịch học. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lịch học này?")) return;

    try {
      setDeletingId(id);
      await api.delete(`/schedules/${id}`);
      await fetchSchedules();
    } catch (error) {
      window.alert(error.response?.data?.message || "Không thể xóa lịch học.");
    } finally {
      setDeletingId(null);
    }
  };

  const statCards = DAYS.map((day) => ({
    day,
    count: schedules.filter((schedule) => schedule.day_of_week === day).length,
  }));

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <CalendarDays size={16} />
            <span>Thời khóa biểu</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Lịch học
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý lịch học và phân bổ phòng theo từng ngày trong tuần.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === "week"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Thời khóa biểu
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === "list"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Danh sách
            </button>
          </div>

          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          >
            <Plus size={18} />
            Thêm lịch học
          </button>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-3 sm:grid-cols-7">
        {statCards.map(({ day, count }) => {
          const active = selectedDay === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(active ? "" : day)}
              className={`rounded-2xl border bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                active
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-xs font-semibold text-slate-500">
                {DAY_LABELS[day]}
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  count ? "text-blue-600" : "text-slate-300"
                }`}
              >
                {count}
              </p>
              <p className="text-xs text-slate-400">lịch học</p>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm môn học, giảng viên, phòng..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          {(selectedDay || search) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDay("");
                setSearch("");
              }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {viewMode === "week" ? "Lịch theo tuần" : "Danh sách lịch học"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredSchedules.length} lịch học
              {selectedDay ? ` · ${DAY_LABELS[selectedDay]}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSchedules}
            className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:self-auto"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-blue-600" />
            <p className="text-sm">Đang tải lịch học...</p>
          </div>
        ) : loadError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <p className="font-semibold text-slate-800">{loadError}</p>
            <button
              type="button"
              onClick={fetchSchedules}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={26} />
            </span>
            <p className="mt-4 font-semibold text-slate-800">
              {search || selectedDay
                ? "Không tìm thấy lịch học phù hợp"
                : "Chưa có lịch học"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử thay đổi bộ lọc hoặc thêm lịch học mới.
            </p>
          </div>
        ) : viewMode === "week" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="border-r border-slate-100 px-3 py-4 text-center last:border-r-0"
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      {DAY_LABELS[day]}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {schedulesByDay[day].length} lịch
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid min-h-72 grid-cols-7">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="space-y-2 border-r border-slate-100 p-2 last:border-r-0"
                  >
                    {schedulesByDay[day].length === 0 ? (
                      <p className="py-6 text-center text-xs text-slate-300">
                        Chưa có lịch
                      </p>
                    ) : (
                      schedulesByDay[day].map((schedule, index) => {
                        const color = getColor(index);

                        return (
                          <button
                            key={schedule.id}
                            type="button"
                            onClick={() => openModal(schedule)}
                            className="block w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                            style={{
                              backgroundColor: color.bg,
                              borderColor: color.border,
                            }}
                          >
                            <p
                              className="truncate text-xs font-bold"
                              style={{ color: color.text }}
                              title={schedule.subject}
                            >
                              {schedule.subject}
                            </p>
                            <p
                              className="mt-2 flex items-center gap-1 text-xs font-semibold"
                              style={{ color: color.text }}
                            >
                              <Clock3 size={12} />
                              {getTime(schedule.start_time)} –{" "}
                              {getTime(schedule.end_time)}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {schedule.room_code || "Chưa có phòng"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Môn học",
                    "Giảng viên",
                    "Phòng",
                    "Ngày",
                    "Thời gian",
                    "Học kỳ",
                    "Thao tác",
                  ].map((title) => (
                    <th
                      key={title}
                      className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchedules.map((schedule, index) => {
                  const color = getColor(index);

                  return (
                    <tr
                      key={schedule.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color.dot }}
                          />
                          <span className="font-semibold text-slate-800">
                            {schedule.subject}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {schedule.instructor || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-blue-700">
                          {schedule.room_code || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {schedule.building_name || "Tòa nhà"} · Tầng{" "}
                          {schedule.floor_number ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: color.bg,
                            borderColor: color.border,
                            color: color.text,
                          }}
                        >
                          {DAY_LABELS[schedule.day_of_week] ||
                            schedule.day_of_week}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                        {getTime(schedule.start_time)} –{" "}
                        {getTime(schedule.end_time)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {schedule.semester || "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openModal(schedule)}
                            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                            title="Chỉnh sửa lịch"
                            aria-label="Chỉnh sửa lịch"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(schedule.id)}
                            disabled={deletingId === schedule.id}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Xóa lịch"
                            aria-label="Xóa lịch"
                          >
                            {deletingId === schedule.id ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
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
            aria-labelledby="schedule-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Thời khóa biểu
                </p>
                <h2
                  id="schedule-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {editSchedule ? "Chỉnh sửa lịch học" : "Thêm lịch học"}
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

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label
                  htmlFor="schedule-room"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phòng học
                </label>
                <div className="relative">
                  <select
                    id="schedule-room"
                    value={form.room_id}
                    onChange={(event) =>
                      updateForm("room_id", event.target.value)
                    }
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Chọn phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.code} — {room.name || "Phòng học"}
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
                <label
                  htmlFor="schedule-subject"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Môn học
                </label>
                <input
                  id="schedule-subject"
                  type="text"
                  value={form.subject}
                  onChange={(event) =>
                    updateForm("subject", event.target.value)
                  }
                  placeholder="Ví dụ: Lập trình Web"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  htmlFor="schedule-instructor"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Giảng viên
                </label>
                <input
                  id="schedule-instructor"
                  type="text"
                  value={form.instructor}
                  onChange={(event) =>
                    updateForm("instructor", event.target.value)
                  }
                  placeholder="Tên giảng viên"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Ngày học
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DAYS.map((day) => {
                    const active = form.day_of_week === day;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => updateForm("day_of_week", day)}
                        className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                          active
                            ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/20"
                            : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="schedule-start"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Giờ bắt đầu
                  </label>
                  <input
                    id="schedule-start"
                    type="time"
                    value={form.start_time}
                    onChange={(event) =>
                      updateForm("start_time", event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="schedule-end"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Giờ kết thúc
                  </label>
                  <input
                    id="schedule-end"
                    type="time"
                    value={form.end_time}
                    onChange={(event) =>
                      updateForm("end_time", event.target.value)
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="schedule-semester"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Học kỳ
                  </label>
                  <input
                    id="schedule-semester"
                    type="text"
                    value={form.semester}
                    onChange={(event) =>
                      updateForm("semester", event.target.value)
                    }
                    placeholder="Ví dụ: 2026-1"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check size={17} />
                      {editSchedule ? "Lưu thay đổi" : "Thêm lịch học"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
