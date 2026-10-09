import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

const STATUS_MAP = {
  cho_duyet: {
    label: "Chờ duyệt",
    color: "#b45309",
    background: "#fffbeb",
    border: "#fde68a",
    icon: Clock3,
  },
  da_duyet: {
    label: "Đã duyệt",
    color: "#15803d",
    background: "#f0fdf4",
    border: "#bbf7d0",
    icon: CheckCircle2,
  },
  tu_choi: {
    label: "Từ chối",
    color: "#b91c1c",
    background: "#fef2f2",
    border: "#fecaca",
    icon: XCircle,
  },
  da_huy: {
    label: "Đã hủy",
    color: "#475569",
    background: "#f8fafc",
    border: "#e2e8f0",
    icon: X,
  },
};

const INITIAL_FORM = {
  room_id: "",
  date: "",
  start_time: "",
  end_time: "",
  purpose: "",
  note: "",
};

function getLocalDateValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";

  // Tránh lệch ngày khi API trả ngày dạng YYYY-MM-DD.
  const dateOnly = String(value).slice(0, 10);
  const parts = dateOnly.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("vi-VN");
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : "—";
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [formError, setFormError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const [bookingsRes, roomsRes, statsRes] = await Promise.all([
        api.get("/bookings"),
        api.get("/rooms"),
        api.get("/bookings/stats"),
      ]);

      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error("Không thể tải dữ liệu đặt phòng:", error);
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

  const filteredBookings = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return bookings.filter((booking) => {
      const matchesStatus = !filterStatus || booking.status === filterStatus;
      const searchableText = [
        booking.room_code,
        booking.user_name,
        booking.user_email,
        booking.purpose,
        booking.building_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("vi");

      return matchesStatus && (!keyword || searchableText.includes(keyword));
    });
  }, [bookings, filterStatus, search]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(INITIAL_FORM);
    setFormError("");
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
      await api.post("/bookings", {
        ...form,
        room_id: Number(form.room_id),
      });

      setShowModal(false);
      setForm(INITIAL_FORM);
      await fetchAll();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Không thể tạo yêu cầu đặt phòng. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      setBusyId(id);
      await api.patch(`/bookings/${id}/status`, { status });
      await fetchAll();
    } catch (error) {
      window.alert(
        error.response?.data?.message || "Không thể cập nhật trạng thái.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa yêu cầu này?");
    if (!confirmed) return;

    try {
      setBusyId(id);
      await api.delete(`/bookings/${id}`);
      await fetchAll();
    } catch (error) {
      window.alert(error.response?.data?.message || "Không thể xóa yêu cầu.");
    } finally {
      setBusyId(null);
    }
  };

  const statsCards = [
    {
      label: "Tổng yêu cầu",
      value: stats.total ?? bookings.length,
      icon: CalendarDays,
      color: "#2563eb",
      background: "#eff6ff",
      filter: "",
    },
    {
      label: "Chờ duyệt",
      value: stats.pending ?? 0,
      icon: Clock3,
      color: "#d97706",
      background: "#fffbeb",
      filter: "cho_duyet",
    },
    {
      label: "Đã duyệt",
      value: stats.approved ?? 0,
      icon: CheckCircle2,
      color: "#16a34a",
      background: "#f0fdf4",
      filter: "da_duyet",
    },
    {
      label: "Từ chối",
      value: stats.rejected ?? 0,
      icon: XCircle,
      color: "#dc2626",
      background: "#fef2f2",
      filter: "tu_choi",
    },
  ];

  return (
    <div className="min-h-screen space-y-6 bg-slate-50/70 p-4 md:p-6">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">
            <CalendarDays size={16} />
            <span>Quản lý phòng học</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Lịch sử đặt phòng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi và xử lý các yêu cầu sử dụng phòng học.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError("");
            setShowModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <Plus size={18} />
          Đặt phòng mới
        </button>
      </header>

      {/* Thống kê */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statsCards.map((item) => {
          const Icon = item.icon;
          const selected = filterStatus === item.filter;

          return (
            <button
              key={item.label}
              type="button"
              onClick={() => setFilterStatus(item.filter)}
              className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                selected
                  ? "border-blue-300 ring-2 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 sm:text-sm">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    color: item.color,
                    backgroundColor: item.background,
                  }}
                >
                  <Icon size={20} />
                </span>
              </div>
            </button>
          );
        })}
      </section>

      {/* Bộ lọc */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo phòng, người đặt hoặc mục đích..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <div className="relative w-full lg:w-52">
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
              aria-label="Lọc theo trạng thái"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_MAP).map(([key, status]) => (
                <option key={key} value={key}>
                  {status.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>
        </div>
      </section>

      {/* Danh sách */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Danh sách yêu cầu</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Hiển thị {filteredBookings.length} / {bookings.length} yêu cầu
            </p>
          </div>
          <button
            type="button"
            onClick={fetchAll}
            className="self-start rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:self-auto"
          >
            Tải lại
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-500">
            <LoaderCircle size={28} className="animate-spin text-blue-600" />
            <p className="text-sm">Đang tải danh sách...</p>
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
        ) : filteredBookings.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CalendarDays size={26} />
            </span>
            <p className="mt-4 font-semibold text-slate-700">
              {search || filterStatus
                ? "Không tìm thấy yêu cầu phù hợp"
                : "Chưa có yêu cầu đặt phòng"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Thử thay đổi bộ lọc hoặc tạo yêu cầu đặt phòng mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Phòng học",
                    "Người đặt",
                    "Thời gian",
                    "Mục đích",
                    "Trạng thái",
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
                {filteredBookings.map((booking) => {
                  const status = STATUS_MAP[booking.status];
                  const StatusIcon = status?.icon;
                  const isBusy = busyId === booking.id;

                  return (
                    <tr
                      key={booking.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <DoorOpen size={18} />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {booking.room_code || "Chưa rõ phòng"}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {booking.building_name || "Tòa nhà"} · Tầng{" "}
                              {booking.floor_number ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">
                          {booking.user_name || "Không rõ"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {booking.user_email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-start gap-2.5">
                          <CalendarDays
                            size={16}
                            className="mt-0.5 shrink-0 text-slate-400"
                          />
                          <div>
                            <p className="font-medium text-slate-800">
                              {formatDate(booking.date)}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatTime(booking.start_time)} –{" "}
                              {formatTime(booking.end_time)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-56 px-5 py-4">
                        <p
                          className="truncate text-sm text-slate-600"
                          title={booking.purpose || ""}
                        >
                          {booking.purpose || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {status ? (
                          <span
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold"
                            style={{
                              color: status.color,
                              backgroundColor: status.background,
                              borderColor: status.border,
                            }}
                          >
                            <StatusIcon size={13} />
                            {status.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Không xác định
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {isBusy ? (
                            <LoaderCircle
                              size={18}
                              className="animate-spin text-blue-600"
                            />
                          ) : (
                            <>
                              {booking.status === "cho_duyet" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatus(booking.id, "da_duyet")
                                    }
                                    className="rounded-lg p-2 text-green-700 transition hover:bg-green-50"
                                    title="Duyệt yêu cầu"
                                    aria-label="Duyệt yêu cầu"
                                  >
                                    <Check size={17} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleStatus(booking.id, "tu_choi")
                                    }
                                    className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                                    title="Từ chối yêu cầu"
                                    aria-label="Từ chối yêu cầu"
                                  >
                                    <X size={17} />
                                  </button>
                                </>
                              )}

                              {booking.status === "da_duyet" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatus(booking.id, "da_huy")
                                  }
                                  className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-50"
                                  title="Hủy đặt phòng"
                                  aria-label="Hủy đặt phòng"
                                >
                                  <XCircle size={17} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDelete(booking.id)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                title="Xóa yêu cầu"
                                aria-label="Xóa yêu cầu"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
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

      {/* Hộp thoại tạo yêu cầu */}
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
            aria-labelledby="booking-modal-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  Yêu cầu sử dụng phòng
                </p>
                <h2
                  id="booking-modal-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  Đặt phòng mới
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
                  htmlFor="booking-room"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phòng học
                </label>
                <div className="relative">
                  <DoorOpen
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    id="booking-room"
                    value={form.room_id}
                    onChange={(event) =>
                      updateForm("room_id", event.target.value)
                    }
                    required
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Chọn phòng học</option>
                    {rooms
                      .filter((room) => room.status === "trong")
                      .map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.code} — {room.name || "Phòng học"} (
                          {room.capacity ?? "?"} chỗ)
                        </option>
                      ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
                {rooms.filter((room) => room.status === "trong").length ===
                  0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Hiện không có phòng trống để đặt.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Ngày sử dụng
                </label>
                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="booking-date"
                    type="date"
                    min={getLocalDateValue()}
                    value={form.date}
                    onChange={(event) => updateForm("date", event.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-start"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Giờ bắt đầu
                  </label>
                  <div className="relative">
                    <Clock3
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="booking-start"
                      type="time"
                      value={form.start_time}
                      onChange={(event) =>
                        updateForm("start_time", event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-end"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Giờ kết thúc
                  </label>
                  <div className="relative">
                    <Clock3
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="booking-end"
                      type="time"
                      value={form.end_time}
                      onChange={(event) =>
                        updateForm("end_time", event.target.value)
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-purpose"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Mục đích sử dụng
                </label>
                <input
                  id="booking-purpose"
                  type="text"
                  value={form.purpose}
                  onChange={(event) =>
                    updateForm("purpose", event.target.value)
                  }
                  placeholder="Ví dụ: Họp nhóm, giảng dạy, seminar..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-note"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Ghi chú
                  <span className="ml-1 font-normal text-slate-400">
                    (không bắt buộc)
                  </span>
                </label>
                <textarea
                  id="booking-note"
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                  rows={3}
                  placeholder="Thông tin bổ sung cho yêu cầu..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <Users size={17} />
                      Gửi yêu cầu
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
