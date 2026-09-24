import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  Zap,
  CheckCircle,
  AlertTriangle,
  Shuffle,
  RefreshCw,
} from "lucide-react";
import useSocket from "../../hooks/useSocket";

const INCIDENT_TYPES = {
  chay: {
    label: "Cháy",
    icon: "🔥",
    color: "#ef4444",
    bg: "#fef2f2",
    desc: "Phát hiện khói/lửa trong phòng",
  },
  mat_dien: {
    label: "Mất điện",
    icon: "⚡",
    color: "#f59e0b",
    bg: "#fffbeb",
    desc: "Mất nguồn điện toàn phòng",
  },
  may_chieu_hong: {
    label: "Máy chiếu hỏng",
    icon: "📽️",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    desc: "Máy chiếu không hoạt động",
  },
  dieu_hoa_hong: {
    label: "Điều hòa hỏng",
    icon: "❄️",
    color: "#3b82f6",
    bg: "#eff6ff",
    desc: "Hệ thống điều hòa ngừng hoạt động",
  },
  mat_internet: {
    label: "Mất Internet",
    icon: "🌐",
    color: "#6b7280",
    bg: "#f9fafb",
    desc: "Mất kết nối mạng",
  },
  qua_tai: {
    label: "Quá tải",
    icon: "👥",
    color: "#f97316",
    bg: "#fff7ed",
    desc: "Số người vượt quá sức chứa",
  },
};

const SEVERITY_MAP = {
  thap: { label: "Thấp", color: "#22c55e", bg: "#f0fdf4" },
  trung: { label: "Trung bình", color: "#f59e0b", bg: "#fffbeb" },
  cao: { label: "Cao", color: "#f97316", bg: "#fff7ed" },
  nghiem_trong: { label: "Nghiêm trọng", color: "#ef4444", bg: "#fef2f2" },
};

const STATUS_MAP = {
  dang_xay_ra: { label: "Đang xảy ra", color: "#ef4444", bg: "#fef2f2" },
  dang_xu_ly: { label: "Đang xử lý", color: "#f59e0b", bg: "#fffbeb" },
  da_giai_quyet: { label: "Đã giải quyết", color: "#22c55e", bg: "#f0fdf4" },
};

export default function Simulation() {
  const [rooms, setRooms] = useState([]);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: "",
    type: "chay",
    severity: "trung",
    description: "",
  });
  const [log, setLog] = useState([]);

  useEffect(() => {
    fetchRooms();
    fetchActive();
  }, []);

  useSocket({
    incident_simulated: () => fetchActive(),
    incident_resolved: () => fetchActive(),
  });

  const fetchRooms = async () => {
    try {
      const res = await api.get("/rooms");
      setRooms(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActive = async () => {
    try {
      const res = await api.get("/simulation/active");
      setActiveIncidents(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const addLog = (message, type = "info") => {
    const time = new Date().toLocaleTimeString("vi-VN");
    setLog((prev) => [{ message, type, time }, ...prev].slice(0, 30));
  };

  const handleTrigger = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/simulation/trigger", form);
      const type = INCIDENT_TYPES[form.type];
      addLog(
        `${type.icon} Kích hoạt sự cố "${type.label}" tại phòng ${rooms.find((r) => r.id == form.room_id)?.code}`,
        "success",
      );
      fetchActive();
      setForm({ ...form, room_id: "", description: "" });
    } catch (error) {
      addLog(
        `❌ Lỗi: ${error.response?.data?.message || "Có lỗi xảy ra"}`,
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (incident) => {
    try {
      await api.post("/simulation/resolve", {
        incident_id: incident.id,
        room_id: incident.room_id,
      });
      addLog(
        `✅ Đã giải quyết sự cố tại phòng ${incident.room_code}`,
        "success",
      );
      fetchActive();
    } catch (error) {
      addLog(`❌ Lỗi khi giải quyết sự cố`, "error");
    }
  };

  const handleRandom = async () => {
    setRandomLoading(true);
    try {
      await api.post("/simulation/random");
      addLog(`🎲 Mô phỏng sự cố ngẫu nhiên thành công!`, "success");
      fetchActive();
    } catch (error) {
      addLog(
        `❌ ${error.response?.data?.message || "Lỗi mô phỏng ngẫu nhiên"}`,
        "error",
      );
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Mô phỏng sự cố</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Kích hoạt và quản lý các sự cố mô phỏng real-time
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchActive}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={15} /> Làm mới
          </button>
          <button
            onClick={handleRandom}
            disabled={randomLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #a855f7)",
              boxShadow: "0 4px 15px rgba(139,92,246,0.35)",
            }}
          >
            <Shuffle size={15} />
            {randomLoading ? "Đang mô phỏng..." : "Ngẫu nhiên"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "Đang xảy ra",
            value: activeIncidents.filter((i) => i.status === "dang_xay_ra")
              .length,
            color: "#ef4444",
            bg: "#fef2f2",
            icon: "🚨",
          },
          {
            label: "Đang xử lý",
            value: activeIncidents.filter((i) => i.status === "dang_xu_ly")
              .length,
            color: "#f59e0b",
            bg: "#fffbeb",
            icon: "⚙️",
          },
          {
            label: "Tổng sự cố",
            value: activeIncidents.length,
            color: "#1a56db",
            bg: "#eff6ff",
            icon: "📋",
          },
          {
            label: "Sự kiện log",
            value: log.length,
            color: "#8b5cf6",
            bg: "#f5f3ff",
            icon: "📝",
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
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

      <div className="grid grid-cols-12 gap-5">
        {/* Left: Form kích hoạt */}
        <div className="col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-red-50">
                ⚡
              </div>
              <div>
                <h2 className="text-base font-black text-gray-800">
                  Kích hoạt sự cố
                </h2>
                <p className="text-xs text-gray-400">Tạo sự cố mô phỏng</p>
              </div>
            </div>

            <form onSubmit={handleTrigger} className="space-y-4">
              {/* Phòng */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Phòng học
                </label>
                <select
                  value={form.room_id}
                  onChange={(e) =>
                    setForm({ ...form, room_id: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                  required
                >
                  <option value="">Chọn phòng</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} (
                      {r.status === "trong"
                        ? "✅ Trống"
                        : r.status === "dang_hoc"
                          ? "📚 Đang học"
                          : "⚠️ " + r.status}
                      )
                    </option>
                  ))}
                </select>
              </div>

              {/* Loại sự cố */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Loại sự cố
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(INCIDENT_TYPES).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, type: key })}
                      className="p-2.5 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                      style={{
                        borderColor: form.type === key ? val.color : "#e5e7eb",
                        background: form.type === key ? val.bg : "white",
                        boxShadow:
                          form.type === key
                            ? `0 2px 8px ${val.color}30`
                            : "none",
                      }}
                    >
                      <span className="text-lg">{val.icon}</span>
                      <p
                        className="text-xs font-bold mt-1"
                        style={{
                          color: form.type === key ? val.color : "#9ca3af",
                        }}
                      >
                        {val.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mức độ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Mức độ
                </label>
                <div className="flex gap-2">
                  {Object.entries(SEVERITY_MAP).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, severity: key })}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{
                        borderColor:
                          form.severity === key ? val.color : "#e5e7eb",
                        color: form.severity === key ? val.color : "#9ca3af",
                        background: form.severity === key ? val.bg : "white",
                      }}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  placeholder={INCIDENT_TYPES[form.type]?.desc}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  background: loading
                    ? "#fca5a5"
                    : "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 15px rgba(239,68,68,0.35)",
                }}
              >
                {loading ? "⏳ Đang kích hoạt..." : "⚡ Kích hoạt sự cố"}
              </button>
            </form>
          </div>
        </div>

        {/* Right: Active incidents + Log */}
        <div className="col-span-8 space-y-4">
          {/* Active incidents */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-red-50">
                  🚨
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800">
                    Sự cố đang xảy ra
                  </h2>
                  <p className="text-xs text-gray-400">
                    {activeIncidents.length} sự cố chưa giải quyết
                  </p>
                </div>
              </div>
              {activeIncidents.length > 0 && (
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>

            {activeIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-200">
                <CheckCircle size={48} className="mb-3 text-green-200" />
                <p className="text-sm font-medium text-gray-300">
                  Không có sự cố nào đang xảy ra
                </p>
                <p className="text-xs text-gray-200 mt-1">
                  Hệ thống đang hoạt động bình thường
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeIncidents.map((inc) => {
                  const type = INCIDENT_TYPES[inc.type];
                  const severity = SEVERITY_MAP[inc.severity];
                  const status = STATUS_MAP[inc.status];
                  return (
                    <div
                      key={inc.id}
                      className="flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:shadow-md"
                      style={{
                        borderColor: type?.color + "30",
                        background: type?.bg,
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                          style={{ background: "white" }}
                        >
                          {type?.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-sm font-black"
                              style={{ color: type?.color }}
                            >
                              {type?.label}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: severity?.color,
                                background: "white",
                              }}
                            >
                              {severity?.label}
                            </span>
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{
                                color: status?.color,
                                background: "white",
                              }}
                            >
                              {status?.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-gray-700">
                            Phòng {inc.room_code} — {inc.building_name} / Tầng{" "}
                            {inc.floor_number}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(inc.occurred_at).toLocaleString("vi-VN")}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResolve(inc)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 shadow-md"
                        style={{
                          background:
                            "linear-gradient(135deg, #22c55e, #16a34a)",
                          boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
                        }}
                      >
                        <CheckCircle size={14} /> Giải quyết
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-purple-50">
                  📋
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-800">
                    Nhật ký sự kiện
                  </h2>
                  <p className="text-xs text-gray-400">Real-time event log</p>
                </div>
              </div>
              {log.length > 0 && (
                <button
                  onClick={() => setLog([])}
                  className="text-xs text-red-400 hover:underline font-medium"
                >
                  Xóa log
                </button>
              )}
            </div>

            {log.length === 0 ? (
              <div className="text-center py-6 text-gray-200">
                <p className="text-sm">Chưa có sự kiện nào</p>
                <p className="text-xs mt-1">Kích hoạt sự cố để xem log</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {log.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background:
                        l.type === "success"
                          ? "#f0fdf4"
                          : l.type === "error"
                            ? "#fef2f2"
                            : "#f8fafc",
                    }}
                  >
                    <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5 font-mono">
                      {l.time}
                    </span>
                    <p
                      className={`font-medium ${
                        l.type === "success"
                          ? "text-green-600"
                          : l.type === "error"
                            ? "text-red-600"
                            : "text-gray-600"
                      }`}
                    >
                      {l.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
