import { useState, useEffect } from "react";
import api from "../../services/api";
import { Plus, Trash2, AlertTriangle, Wrench, ChevronDown } from "lucide-react";

const INCIDENT_TYPES = {
  chay: { label: "Cháy", icon: "🔥", color: "#ef4444", bg: "#fef2f2" },
  mat_dien: { label: "Mất điện", icon: "⚡", color: "#f59e0b", bg: "#fffbeb" },
  may_chieu_hong: {
    label: "Máy chiếu hỏng",
    icon: "📽️",
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  dieu_hoa_hong: {
    label: "Điều hòa hỏng",
    icon: "❄️",
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  mat_internet: {
    label: "Mất Internet",
    icon: "🌐",
    color: "#6b7280",
    bg: "#f9fafb",
  },
  qua_tai: { label: "Quá tải", icon: "👥", color: "#f97316", bg: "#fff7ed" },
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

const MAINTENANCE_STATUS = {
  cho_xu_ly: { label: "Chờ xử lý", color: "#f59e0b", bg: "#fffbeb" },
  dang_sua: { label: "Đang sửa", color: "#3b82f6", bg: "#eff6ff" },
  da_xong: { label: "Đã xong", color: "#22c55e", bg: "#f0fdf4" },
  huy: { label: "Hủy", color: "#6b7280", bg: "#f9fafb" },
};

export default function Incidents() {
  const [tab, setTab] = useState("incidents");
  const [incidents, setIncidents] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [incidentStats, setIncidentStats] = useState({});
  const [maintenanceStats, setMaintenanceStats] = useState({});

  const [incidentForm, setIncidentForm] = useState({
    room_id: "",
    type: "chay",
    description: "",
    severity: "trung",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    device_id: "",
    description: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [inc, maint, incStats, maintStats, roomsRes, devicesRes] =
        await Promise.all([
          api.get("/incidents"),
          api.get("/maintenance"),
          api.get("/incidents/stats"),
          api.get("/maintenance/stats"),
          api.get("/rooms"),
          api.get("/devices"),
        ]);
      setIncidents(inc.data);
      setMaintenance(maint.data);
      setIncidentStats(incStats.data);
      setMaintenanceStats(maintStats.data);
      setRooms(roomsRes.data);
      setDevices(devicesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/incidents", incidentForm);
      setShowModal(false);
      fetchAll();
      setIncidentForm({
        room_id: "",
        type: "chay",
        description: "",
        severity: "trung",
      });
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/maintenance", maintenanceForm);
      setShowModal(false);
      fetchAll();
      setMaintenanceForm({ device_id: "", description: "" });
    } catch (error) {
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  const handleIncidentStatus = async (id, status) => {
    try {
      await api.patch(`/incidents/${id}/status`, { status });
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMaintenanceStatus = async (id, status) => {
    try {
      await api.patch(`/maintenance/${id}/status`, { status });
      fetchAll();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteIncident = async (id) => {
    if (!window.confirm("Xóa sự cố này?")) return;
    await api.delete(`/incidents/${id}`);
    fetchAll();
  };

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm("Xóa yêu cầu này?")) return;
    await api.delete(`/maintenance/${id}`);
    fetchAll();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Sự cố & Bảo trì</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Quản lý sự cố và yêu cầu bảo trì thiết bị
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg transition-all hover:opacity-90"
          style={{
            background:
              tab === "incidents"
                ? "linear-gradient(135deg, #ef4444, #f97316)"
                : "linear-gradient(135deg, #f59e0b, #fbbf24)",
            boxShadow: "0 4px 15px rgba(239,68,68,0.35)",
          }}
        >
          <Plus size={16} />
          {tab === "incidents" ? "Thêm sự cố" : "Báo hỏng"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {tab === "incidents" ? (
          <>
            {[
              {
                label: "Tổng sự cố",
                value: incidentStats.total || 0,
                color: "#1a56db",
                bg: "#eff6ff",
                icon: "📋",
              },
              {
                label: "Đang xảy ra",
                value: incidentStats.active || 0,
                color: "#ef4444",
                bg: "#fee2e2",
                icon: "🚨",
              },
              {
                label: "Đang xử lý",
                value: incidentStats.processing || 0,
                color: "#f59e0b",
                bg: "#fef9c3",
                icon: "⚙️",
              },
              {
                label: "Đã giải quyết",
                value: incidentStats.resolved || 0,
                color: "#22c55e",
                bg: "#f0fdf4",
                icon: "✅",
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
          </>
        ) : (
          <>
            {[
              {
                label: "Tổng báo hỏng",
                value: maintenanceStats.total || 0,
                color: "#1a56db",
                bg: "#eff6ff",
                icon: "📋",
              },
              {
                label: "Chờ xử lý",
                value: maintenanceStats.pending || 0,
                color: "#f59e0b",
                bg: "#fef9c3",
                icon: "⏳",
              },
              {
                label: "Đang sửa",
                value: maintenanceStats.processing || 0,
                color: "#3b82f6",
                bg: "#dbeafe",
                icon: "🔧",
              },
              {
                label: "Đã xong",
                value: maintenanceStats.done || 0,
                color: "#22c55e",
                bg: "#f0fdf4",
                icon: "✅",
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
          </>
        )}
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("incidents")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
              tab === "incidents"
                ? "text-red-500 border-red-500 bg-red-50/50"
                : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle size={16} />
            Sự cố
            <span
              className="px-2 py-0.5 rounded-full text-xs font-black"
              style={{
                background: tab === "incidents" ? "#fef2f2" : "#f3f4f6",
                color: tab === "incidents" ? "#ef4444" : "#9ca3af",
              }}
            >
              {incidents.length}
            </span>
          </button>
          <button
            onClick={() => setTab("maintenance")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
              tab === "maintenance"
                ? "text-amber-500 border-amber-500 bg-amber-50/50"
                : "text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Wrench size={16} />
            Bảo trì
            <span
              className="px-2 py-0.5 rounded-full text-xs font-black"
              style={{
                background: tab === "maintenance" ? "#fffbeb" : "#f3f4f6",
                color: tab === "maintenance" ? "#f59e0b" : "#9ca3af",
              }}
            >
              {maintenance.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Đang tải...</p>
            </div>
          </div>
        ) : tab === "incidents" ? (
          incidents.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <AlertTriangle size={48} className="mx-auto mb-3" />
              <p className="text-sm">Không có sự cố nào</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    background: "linear-gradient(135deg, #fff5f5, #fef2f2)",
                  }}
                >
                  {[
                    "Loại sự cố",
                    "Phòng",
                    "Mô tả",
                    "Mức độ",
                    "Thời gian",
                    "Trạng thái",
                    "Xóa",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incidents.map((inc) => {
                  const type = INCIDENT_TYPES[inc.type];
                  const severity = SEVERITY_MAP[inc.severity];
                  const status = STATUS_MAP[inc.status];
                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-red-50/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: type?.bg }}
                          >
                            {type?.icon}
                          </div>
                          <span
                            className="text-sm font-bold"
                            style={{ color: type?.color }}
                          >
                            {type?.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-black text-blue-600">
                          {inc.room_code}
                        </p>
                        <p className="text-xs text-gray-400">
                          {inc.building_name} / T{inc.floor_number}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-40 truncate">
                        {inc.description || "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{
                            color: severity?.color,
                            background: severity?.bg,
                          }}
                        >
                          {severity?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(inc.occurred_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={inc.status}
                          onChange={(e) =>
                            handleIncidentStatus(inc.id, e.target.value)
                          }
                          className="text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer"
                          style={{
                            color: status?.color,
                            background: status?.bg,
                          }}
                        >
                          {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteIncident(inc.id)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : maintenance.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <Wrench size={48} className="mx-auto mb-3" />
            <p className="text-sm">Không có yêu cầu bảo trì nào</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: "linear-gradient(135deg, #fffdf0, #fffbeb)",
                }}
              >
                {[
                  "Thiết bị",
                  "Phòng",
                  "Mô tả",
                  "Người báo",
                  "Thời gian",
                  "Trạng thái",
                  "Xóa",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3.5 text-xs font-black text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {maintenance.map((m) => {
                const status = MAINTENANCE_STATUS[m.status];
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-amber-50/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-700">
                        {m.device_name}
                      </p>
                      <p className="text-xs text-gray-400">{m.device_type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-black text-blue-600">
                        {m.room_code}
                      </p>
                      <p className="text-xs text-gray-400">{m.building_code}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-40 truncate">
                      {m.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {m.reported_by_name}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(m.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.status}
                        onChange={(e) =>
                          handleMaintenanceStatus(m.id, e.target.value)
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer"
                        style={{ color: status?.color, background: status?.bg }}
                      >
                        {Object.entries(MAINTENANCE_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteMaintenance(m.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div
              className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{
                background:
                  tab === "incidents"
                    ? "linear-gradient(135deg, #fff5f5, #fef2f2)"
                    : "linear-gradient(135deg, #fffdf0, #fffbeb)",
              }}
            >
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  {tab === "incidents"
                    ? "🚨 Thêm sự cố mới"
                    : "🔧 Báo hỏng thiết bị"}
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

            {tab === "incidents" ? (
              <form onSubmit={handleIncidentSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Phòng
                  </label>
                  <select
                    value={incidentForm.room_id}
                    onChange={(e) =>
                      setIncidentForm({
                        ...incidentForm,
                        room_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Loại sự cố
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(INCIDENT_TYPES).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setIncidentForm({ ...incidentForm, type: key })
                        }
                        className="p-2.5 rounded-xl border-2 text-left transition-all"
                        style={{
                          borderColor:
                            incidentForm.type === key ? val.color : "#e5e7eb",
                          background:
                            incidentForm.type === key ? val.bg : "white",
                        }}
                      >
                        <span className="text-lg">{val.icon}</span>
                        <p
                          className="text-xs font-bold mt-1"
                          style={{
                            color:
                              incidentForm.type === key ? val.color : "#6b7280",
                          }}
                        >
                          {val.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Mức độ
                  </label>
                  <div className="flex gap-2">
                    {Object.entries(SEVERITY_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setIncidentForm({ ...incidentForm, severity: key })
                        }
                        className="flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                        style={{
                          borderColor:
                            incidentForm.severity === key
                              ? val.color
                              : "#e5e7eb",
                          color:
                            incidentForm.severity === key
                              ? val.color
                              : "#9ca3af",
                          background:
                            incidentForm.severity === key ? val.bg : "white",
                        }}
                      >
                        {val.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Mô tả
                  </label>
                  <textarea
                    value={incidentForm.description}
                    onChange={(e) =>
                      setIncidentForm({
                        ...incidentForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Mô tả chi tiết sự cố..."
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #ef4444, #f97316)",
                    }}
                  >
                    🚨 Tạo sự cố
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={handleMaintenanceSubmit}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Thiết bị hỏng
                  </label>
                  <select
                    value={maintenanceForm.device_id}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        device_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                    required
                  >
                    <option value="">Chọn thiết bị</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.room_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Mô tả tình trạng
                  </label>
                  <textarea
                    value={maintenanceForm.description}
                    onChange={(e) =>
                      setMaintenanceForm({
                        ...maintenanceForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Mô tả chi tiết tình trạng hỏng hóc..."
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                    }}
                  >
                    🔧 Báo hỏng
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
