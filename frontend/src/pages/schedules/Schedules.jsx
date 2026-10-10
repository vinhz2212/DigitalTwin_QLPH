import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit2,
  LoaderCircle,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRound,
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

const SESSION_TYPES = {
  theory: {
    label: "Lý thuyết",
    shortLabel: "Lịch học",
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1d4ed8",
    dot: "#3b82f6",
  },
  practical: {
    label: "Thực hành",
    shortLabel: "Thực hành",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    text: "#15803d",
    dot: "#22c55e",
  },
  exam: {
    label: "Thi",
    shortLabel: "Lịch thi",
    bg: "#fff7ed",
    border: "#fed7aa",
    text: "#c2410c",
    dot: "#f97316",
  },
};

const getDateOnly = (value) => (value ? String(value).slice(0, 10) : "");

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayLocal = () => toDateKey(new Date());

const parseLocalDate = (value) => {
  const dateOnly = getDateOnly(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const getDayKey = (value) => {
  const date = parseLocalDate(value);
  if (!date) return "";

  const dayKeys = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return dayKeys[date.getDay()];
};

const getMonday = (value) => {
  const date = parseLocalDate(value) || new Date();
  const dayOfWeek = date.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  date.setDate(date.getDate() - daysSinceMonday);
  return toDateKey(date);
};

const addDays = (value, amount) => {
  const date = parseLocalDate(value);
  if (!date) return "";

  date.setDate(date.getDate() + amount);
  return toDateKey(date);
};

const formatDate = (value, options = {}) => {
  const date = parseLocalDate(value);
  if (!date) return "Chưa có ngày";

  return new Intl.DateTimeFormat("vi-VN", options).format(date);
};

const formatDateWithDay = (value) => {
  const dayKey = getDayKey(value);
  const dateText = formatDate(value);

  return dayKey ? `${DAY_LABELS[dayKey]}, ${dateText}` : dateText;
};

const getTime = (value) => (value ? String(value).slice(0, 5) : "--:--");

const getSessionType = (schedule) =>
  SESSION_TYPES[schedule?.session_type] ? schedule.session_type : "theory";

const getSessionStyle = (schedule) => SESSION_TYPES[getSessionType(schedule)];

const EMPTY_FORM = {
  room_id: "",
  subject: "",
  session_type: "theory",
  instructor: "",
  class_date: getTodayLocal(),
  start_time: "07:00",
  end_time: "09:00",
  semester: "",
};

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
  const [typeFilter, setTypeFilter] = useState("all");
  const [weekStart, setWeekStart] = useState(() => getMonday(getTodayLocal()));
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

  const weekDates = useMemo(
    () => DAYS.map((_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const weekLabel = useMemo(() => {
    if (!weekDates.length) return "";

    const start = parseLocalDate(weekDates[0]);
    const end = parseLocalDate(weekDates[6]);
    if (!start || !end) return "";

    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    };

    return `${new Intl.DateTimeFormat("vi-VN", options).format(start)} – ${new Intl.DateTimeFormat(
      "vi-VN",
      options,
    ).format(end)}`;
  }, [weekDates]);

  const filteredSchedules = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return schedules
      .filter((schedule) => {
        const dayKey = getDayKey(schedule.class_date);
        const matchesDay = !selectedDay || dayKey === selectedDay;
        const type = getSessionType(schedule);

        const matchesType =
          typeFilter === "all" ||
          (typeFilter === "classes" && type !== "exam") ||
          (typeFilter === "exam" && type === "exam");

        const searchableText = [
          schedule.subject,
          schedule.instructor,
          schedule.room_code,
          schedule.room_name,
          schedule.building_name,
          schedule.semester,
          SESSION_TYPES[type].label,
          formatDate(schedule.class_date),
          formatDateWithDay(schedule.class_date),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("vi");

        return (
          matchesDay &&
          matchesType &&
          (!keyword || searchableText.includes(keyword))
        );
      })
      .sort((a, b) => {
        const dateOrder = getDateOnly(a.class_date).localeCompare(
          getDateOnly(b.class_date),
        );

        if (dateOrder !== 0) return dateOrder;

        return getTime(a.start_time).localeCompare(getTime(b.start_time));
      });
  }, [schedules, search, selectedDay, typeFilter]);

  const schedulesByDate = useMemo(() => {
    const result = {};

    weekDates.forEach((date) => {
      result[date] = filteredSchedules.filter(
        (schedule) => getDateOnly(schedule.class_date) === date,
      );
    });

    return result;
  }, [filteredSchedules, weekDates]);

  const statCards = useMemo(
    () =>
      weekDates.map((date, index) => ({
        date,
        day: DAYS[index],
        count: schedulesByDate[date]?.length || 0,
      })),
    [weekDates, schedulesByDate],
  );

  const goToPreviousWeek = () => {
    setWeekStart((current) => addDays(current, -7));
    setSelectedDay("");
  };

  const goToNextWeek = () => {
    setWeekStart((current) => addDays(current, 7));
    setSelectedDay("");
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(getTodayLocal()));
    setSelectedDay("");
  };

  const handleDateJump = (event) => {
    const selectedDate = event.target.value;
    if (!parseLocalDate(selectedDate)) return;

    setWeekStart(getMonday(selectedDate));
    setSelectedDay("");
    setViewMode("week");
  };

  const openModal = (schedule = null) => {
    setFormError("");

    if (schedule) {
      setEditSchedule(schedule);
      setForm({
        room_id: String(schedule.room_id ?? ""),
        subject: schedule.subject ?? "",
        session_type: getSessionType(schedule),
        instructor: schedule.instructor ?? "",
        class_date: getDateOnly(schedule.class_date),
        start_time: getTime(schedule.start_time),
        end_time: getTime(schedule.end_time),
        semester: schedule.semester ?? "",
      });
    } else {
      setEditSchedule(null);
      setForm({
        ...EMPTY_FORM,
        class_date: getTodayLocal(),
      });
    }

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditSchedule(null);
    setForm({
      ...EMPTY_FORM,
      class_date: getTodayLocal(),
    });
    setFormError("");
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!parseLocalDate(form.class_date)) {
      setFormError("Vui lòng chọn ngày học hợp lệ.");
      return;
    }

    if (!SESSION_TYPES[form.session_type]) {
      setFormError("Vui lòng chọn loại buổi hợp lệ.");
      return;
    }

    if (form.start_time >= form.end_time) {
      setFormError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        room_id: Number(form.room_id),
        subject: form.subject.trim(),
        session_type: form.session_type,
        instructor: form.instructor.trim(),
        class_date: form.class_date,
        start_time: form.start_time,
        end_time: form.end_time,
        semester: form.semester.trim(),
      };

      if (editSchedule) {
        await api.put(`/schedules/${editSchedule.id}`, payload);
      } else {
        await api.post("/schedules", payload);
      }

      setShowModal(false);
      setEditSchedule(null);
      setForm({
        ...EMPTY_FORM,
        class_date: getTodayLocal(),
      });
      await fetchSchedules();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể lưu lịch. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa lịch này?")) return;

    try {
      setDeletingId(id);
      await api.delete(`/schedules/${id}`);
      await fetchSchedules();
    } catch (error) {
      window.alert(error.response?.data?.message || "Không thể xóa lịch.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <CalendarDays size={16} />
            <span>Thời khóa biểu</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Lịch học, lịch thi theo tuần
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Chọn ngày, xem lịch theo tuần và phân biệt lịch học với lịch thi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <Plus size={18} />
          Thêm buổi học
        </button>
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: "all", label: "Tất cả" },
            { value: "classes", label: "Lịch học" },
            { value: "exam", label: "Lịch thi" },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTypeFilter(filter.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                typeFilter === filter.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <CalendarDays size={16} className="text-blue-600" />
            <span className="hidden sm:inline">Chọn ngày</span>
            <input
              type="date"
              value={weekDates.includes(getTodayLocal()) ? getTodayLocal() : ""}
              onChange={handleDateJump}
              className="max-w-[150px] bg-transparent text-sm outline-none"
              aria-label="Chọn ngày để xem tuần"
            />
          </label>

          <button
            type="button"
            onClick={goToCurrentWeek}
            className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            Hiện tại
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Printer size={16} />
            In lịch
          </button>

          <button
            type="button"
            onClick={goToPreviousWeek}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            aria-label="Tuần trước"
          >
            <ChevronLeft size={17} />
            <span className="hidden sm:inline">Trở về</span>
          </button>

          <button
            type="button"
            onClick={goToNextWeek}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            aria-label="Tuần sau"
          >
            <span className="hidden sm:inline">Tiếp</span>
            <ChevronRight size={17} />
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tuần đang xem
          </p>
          <p className="mt-1 font-semibold text-slate-800">{weekLabel}</p>
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
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
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              viewMode === "list"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Danh sách
          </button>
        </div>
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
              placeholder="Tìm môn học, giảng viên, phòng, ngày..."
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
              Xóa tìm kiếm
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {statCards.map(({ date, day, count }) => {
          const active = selectedDay === day;

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDay(active ? "" : day)}
              className={`rounded-2xl border bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                active
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              <p className="text-xs font-bold text-slate-700">
                {DAY_LABELS[day]}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {formatDate(date)}
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${
                  count ? "text-blue-600" : "text-slate-300"
                }`}
              >
                {count}
              </p>
              <p className="text-xs text-slate-400">buổi</p>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              {viewMode === "week" ? "Lịch trong tuần" : "Danh sách lịch"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {weekLabel} ·{" "}
              {weekDates.reduce(
                (total, date) => total + (schedulesByDate[date]?.length || 0),
                0,
              )}{" "}
              buổi
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
            <p className="text-sm">Đang tải lịch...</p>
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
        ) : viewMode === "week" ? (
          <div className="overflow-x-auto">
            <div className="min-w-[1050px]">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {weekDates.map((date, index) => {
                  const day = DAYS[index];
                  const count = schedulesByDate[date]?.length || 0;

                  return (
                    <div
                      key={date}
                      className="border-r border-slate-100 px-3 py-4 text-center last:border-r-0"
                    >
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
                        {DAY_LABELS[day]}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatDate(date)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {count} buổi
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="grid min-h-72 grid-cols-7">
                {weekDates.map((date) => {
                  const daySchedules = schedulesByDate[date] || [];

                  return (
                    <div
                      key={date}
                      className="space-y-2 border-r border-slate-100 p-2 last:border-r-0"
                    >
                      {daySchedules.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-300">
                          Chưa có lịch
                        </p>
                      ) : (
                        daySchedules.map((schedule) => {
                          const style = getSessionStyle(schedule);

                          return (
                            <button
                              key={schedule.id}
                              type="button"
                              onClick={() => openModal(schedule)}
                              className="block w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
                              style={{
                                backgroundColor: style.bg,
                                borderColor: style.border,
                              }}
                            >
                              <span
                                className="mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor: "white",
                                  color: style.text,
                                }}
                              >
                                {SESSION_TYPES[getSessionType(schedule)].label}
                              </span>

                              <p
                                className="truncate text-xs font-bold"
                                style={{ color: style.text }}
                                title={schedule.subject}
                              >
                                {schedule.subject}
                              </p>

                              <p
                                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                                style={{ color: style.text }}
                              >
                                <Clock3 size={12} />
                                {getTime(schedule.start_time)} –{" "}
                                {getTime(schedule.end_time)}
                              </p>

                              <p className="mt-2 truncate text-xs text-slate-600">
                                Phòng:{" "}
                                <span className="font-semibold">
                                  {schedule.room_code ||
                                    schedule.room_name ||
                                    "Chưa có phòng"}
                                </span>
                              </p>

                              <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                                <UserRound size={12} className="shrink-0" />
                                <span className="truncate">
                                  {schedule.instructor || "Chưa có giảng viên"}
                                </span>
                              </p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <CalendarDays size={28} className="text-blue-600" />
            <p className="mt-4 font-semibold text-slate-800">
              Không tìm thấy lịch phù hợp
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử đổi bộ lọc hoặc chọn tuần khác.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Loại",
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
                {filteredSchedules.map((schedule) => {
                  const style = getSessionStyle(schedule);

                  return (
                    <tr
                      key={schedule.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <span
                          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text,
                          }}
                        >
                          {SESSION_TYPES[getSessionType(schedule)].label}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {schedule.subject}
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

                      <td className="whitespace-nowrap px-5 py-4 text-sm">
                        {formatDateWithDay(schedule.class_date)}
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

      <section className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {Object.entries(SESSION_TYPES).map(([type, style]) => (
          <div key={type} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border"
              style={{
                backgroundColor: style.bg,
                borderColor: style.border,
              }}
            />
            <span>{style.label}</span>
          </div>
        ))}
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
                  {editSchedule ? "Chỉnh sửa buổi học" : "Thêm buổi học"}
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
                  htmlFor="schedule-type"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Loại buổi
                </label>
                <select
                  id="schedule-type"
                  value={form.session_type}
                  onChange={(event) =>
                    updateForm("session_type", event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="theory">Lý thuyết</option>
                  <option value="practical">Thực hành</option>
                  <option value="exam">Thi</option>
                </select>
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
                <label
                  htmlFor="schedule-date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Ngày học hoặc ngày thi
                </label>
                <input
                  id="schedule-date"
                  type="date"
                  value={form.class_date}
                  onChange={(event) =>
                    updateForm("class_date", event.target.value)
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
                {form.class_date && (
                  <p className="mt-2 text-xs font-medium text-blue-700">
                    {formatDateWithDay(form.class_date)}
                  </p>
                )}
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
                      {editSchedule ? "Lưu thay đổi" : "Thêm buổi học"}
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
