import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import {
  Send,
  Bot,
  User,
  Zap,
  Wrench,
  Search,
  Mic,
  RefreshCw,
} from "lucide-react";

const QUICK_QUESTIONS = [
  "📊 Có bao nhiêu phòng đang trống?",
  "💡 Thiết bị nào đang hỏng?",
  "⚠️ Sự cố nào đang xảy ra?",
  "🔧 Đề xuất lịch bảo trì",
  "🏫 Tìm phòng cho 40 người",
];

const INCIDENT_TYPES = {
  chay: "🔥 Cháy",
  mat_dien: "⚡ Mất điện",
  may_chieu_hong: "📽️ Máy chiếu hỏng",
  dieu_hoa_hong: "❄️ Điều hòa hỏng",
  mat_internet: "🌐 Mất Internet",
  qua_tai: "👥 Quá tải",
};

function MessageBubble({ msg }) {
  const isAI = msg.role === "assistant";
  return (
    <div className={`flex gap-3 ${isAI ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          isAI ? "" : "bg-gray-100"
        }`}
        style={
          isAI
            ? { background: "linear-gradient(135deg, #1a56db, #3b82f6)" }
            : {}
        }
      >
        {isAI ? (
          <Bot size={16} className="text-white" />
        ) : (
          <User size={16} className="text-gray-500" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-lg rounded-2xl px-4 py-3 text-sm shadow-sm ${
          isAI ? "bg-white border border-gray-100 text-gray-700" : "text-white"
        }`}
        style={
          !isAI
            ? { background: "linear-gradient(135deg, #1a56db, #3b82f6)" }
            : {}
        }
      >
        <div className="space-y-1">
          {msg.content.split("\n").map((line, i) => {
            if (line.startsWith("##") || line.startsWith("**")) {
              return (
                <p key={i} className="font-black text-blue-600">
                  {line.replace(/\*\*/g, "").replace(/##/g, "").trim()}
                </p>
              );
            }
            if (line.startsWith("•") || line.startsWith("*")) {
              return (
                <p key={i} className="pl-2">
                  • {line.replace(/^[•*]\s*/, "").trim()}
                </p>
              );
            }
            return line ? <p key={i}>{line}</p> : <br key={i} />;
          })}
        </div>
        <p
          className={`text-xs mt-2 ${isAI ? "text-gray-300" : "text-blue-200"}`}
        >
          {msg.time}
        </p>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Xin chào! 👋 Tôi là AI Assistant của Smart Campus.\n\nTôi có thể giúp bạn:\n• Phân tích sự cố và đề xuất xử lý\n• Tìm phòng học phù hợp\n• Đề xuất lịch bảo trì thiết bị\n• Trả lời câu hỏi về hệ thống\n\nBạn cần hỗ trợ gì?",
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef(null);

  const [incidentForm, setIncidentForm] = useState({
    incident_type: "chay",
    description: "",
    room_code: "",
  });
  const [incidentResult, setIncidentResult] = useState("");
  const [incidentLoading, setIncidentLoading] = useState(false);

  const [maintenanceForm, setMaintenanceForm] = useState({
    device_name: "",
    device_type: "den",
    last_maintenance: "",
    issue: "",
  });
  const [maintenanceResult, setMaintenanceResult] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const [roomForm, setRoomForm] = useState({
    capacity: 40,
    type: "",
    time: "",
    date: "",
  });
  const [roomResult, setRoomResult] = useState(null);
  const [roomLoading, setRoomLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = {
      role: "user",
      content: input,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await api.post("/ai/chat", { message: input, history });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.response,
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "❌ Xin lỗi, AI đang bận. Vui lòng thử lại sau!\n\n💡 Lưu ý: Cần cấu hình Gemini API Key để sử dụng tính năng này.",
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeIncident = async (e) => {
    e.preventDefault();
    setIncidentLoading(true);
    try {
      const res = await api.post("/ai/analyze-incident", incidentForm);
      setIncidentResult(res.data.response);
    } catch (error) {
      setIncidentResult("❌ Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setIncidentLoading(false);
    }
  };

  const handleSuggestMaintenance = async (e) => {
    e.preventDefault();
    setMaintenanceLoading(true);
    try {
      const res = await api.post("/ai/suggest-maintenance", maintenanceForm);
      setMaintenanceResult(res.data.response);
    } catch (error) {
      setMaintenanceResult("❌ Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleFindRoom = async (e) => {
    e.preventDefault();
    setRoomLoading(true);
    try {
      const res = await api.post("/ai/find-room", roomForm);
      setRoomResult(res.data);
    } catch (error) {
      setRoomResult(null);
    } finally {
      setRoomLoading(false);
    }
  };

  const tabs = [
    { id: "chat", icon: Bot, label: "Chat AI" },
    { id: "incident", icon: Zap, label: "Phân tích sự cố" },
    { id: "maintenance", icon: Wrench, label: "Đề xuất bảo trì" },
    { id: "room", icon: Search, label: "Tìm phòng" },
  ];

  const ResultBox = ({ content }) => (
    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1.5 max-h-72 overflow-y-auto border border-gray-100">
      {content.split("\n").map((line, i) => (
        <p
          key={i}
          className={
            line.startsWith("##") || line.startsWith("**")
              ? "font-black text-blue-600 text-base"
              : line.startsWith("*") || line.startsWith("•")
                ? "pl-3 text-gray-600"
                : "text-gray-700"
          }
        >
          {line
            .replace(/\*\*/g, "")
            .replace(/##/g, "")
            .replace(/^\*\s*/, "• ")
            .replace(/^•\s*/, "• ")}
        </p>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #1a56db, #3b82f6)" }}
          >
            <Bot size={20} className="text-white" />
          </div>
          AI Assistant
        </h1>
        <p className="text-sm text-gray-400 mt-1 ml-13">
          Trợ lý thông minh tích hợp Google Gemini
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              background:
                activeTab === tab.id
                  ? "linear-gradient(135deg, #1a56db, #3b82f6)"
                  : "transparent",
              color: activeTab === tab.id ? "white" : "#6b7280",
              boxShadow:
                activeTab === tab.id
                  ? "0 4px 12px rgba(26,86,219,0.3)"
                  : "none",
            }}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col"
          style={{ height: "65vh" }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                  style={{
                    background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                  }}
                >
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="text-xs text-gray-400 mr-2">
                      AI đang suy nghĩ
                    </span>
                    {[0, 150, 300].map((delay) => (
                      <div
                        key={delay}
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="px-4 py-2 border-t border-gray-50">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q.replace(/^[^\s]+\s/, ""))}
                  className="text-xs px-3 py-1.5 rounded-full border-2 border-blue-100 text-blue-600 hover:bg-blue-50 whitespace-nowrap transition-all font-medium flex-shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all pr-10"
                />
              </div>
              <button
                onClick={() => {
                  setMessages([messages[0]]);
                  setInput("");
                }}
                className="p-3 rounded-xl text-gray-400 hover:bg-gray-100 transition-all"
                title="Xóa lịch sử"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="p-3 rounded-xl text-white transition-all disabled:opacity-40 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #1a56db, #3b82f6)",
                  boxShadow: "0 4px 12px rgba(26,86,219,0.35)",
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Analysis Tab */}
      {activeTab === "incident" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-red-50">
                🚨
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Phân tích sự cố
                </h2>
                <p className="text-xs text-gray-400">
                  AI sẽ phân tích và đề xuất cách xử lý
                </p>
              </div>
            </div>
            <form onSubmit={handleAnalyzeIncident} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Loại sự cố
                </label>
                <select
                  value={incidentForm.incident_type}
                  onChange={(e) =>
                    setIncidentForm({
                      ...incidentForm,
                      incident_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                >
                  {Object.entries(INCIDENT_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Mã phòng
                </label>
                <input
                  type="text"
                  value={incidentForm.room_code}
                  onChange={(e) =>
                    setIncidentForm({
                      ...incidentForm,
                      room_code: e.target.value,
                    })
                  }
                  placeholder="VD: A101"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Mô tả chi tiết
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
                  placeholder="Mô tả tình trạng sự cố..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 bg-gray-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={incidentLoading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  background: incidentLoading
                    ? "#fca5a5"
                    : "linear-gradient(135deg, #ef4444, #f97316)",
                  boxShadow: "0 4px 12px rgba(239,68,68,0.35)",
                }}
              >
                {incidentLoading
                  ? "🔍 Đang phân tích..."
                  : "🔍 Phân tích sự cố"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-blue-50">
                📋
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Kết quả phân tích
                </h2>
                <p className="text-xs text-gray-400">Đề xuất từ AI Gemini</p>
              </div>
            </div>
            {incidentResult ? (
              <ResultBox content={incidentResult} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                <Bot size={48} className="mb-3" />
                <p className="text-sm">Kết quả sẽ hiện ở đây</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === "maintenance" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-amber-50">
                🔧
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Đề xuất bảo trì
                </h2>
                <p className="text-xs text-gray-400">
                  AI đề xuất lịch và quy trình bảo trì
                </p>
              </div>
            </div>
            <form onSubmit={handleSuggestMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Tên thiết bị
                </label>
                <input
                  type="text"
                  value={maintenanceForm.device_name}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      device_name: e.target.value,
                    })
                  }
                  placeholder="VD: Máy chiếu phòng A101"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Loại thiết bị
                </label>
                <select
                  value={maintenanceForm.device_type}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      device_type: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                >
                  {[
                    { value: "den", label: "💡 Đèn" },
                    { value: "dieu_hoa", label: "❄️ Điều hòa" },
                    { value: "may_chieu", label: "📽️ Máy chiếu" },
                    { value: "quat", label: "🌀 Quạt" },
                    { value: "loa", label: "🔊 Loa" },
                    { value: "may_tinh", label: "💻 Máy tính" },
                  ].map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Bảo trì gần nhất
                </label>
                <input
                  type="date"
                  value={maintenanceForm.last_maintenance}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      last_maintenance: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Vấn đề hiện tại
                </label>
                <textarea
                  value={maintenanceForm.issue}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      issue: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Mô tả vấn đề thiết bị..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-400 bg-gray-50"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={maintenanceLoading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  background: maintenanceLoading
                    ? "#fde68a"
                    : "linear-gradient(135deg, #f59e0b, #fbbf24)",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.35)",
                }}
              >
                {maintenanceLoading ? "🔧 Đang xử lý..." : "🔧 Đề xuất bảo trì"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-blue-50">
                📋
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Đề xuất từ AI
                </h2>
                <p className="text-xs text-gray-400">
                  Lịch và quy trình bảo trì
                </p>
              </div>
            </div>
            {maintenanceResult ? (
              <ResultBox content={maintenanceResult} />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                <Wrench size={48} className="mb-3" />
                <p className="text-sm">Đề xuất sẽ hiện ở đây</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Find Room Tab */}
      {activeTab === "room" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-green-50">
                🏫
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Tìm phòng phù hợp
                </h2>
                <p className="text-xs text-gray-400">
                  AI tìm phòng theo yêu cầu
                </p>
              </div>
            </div>
            <form onSubmit={handleFindRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Sức chứa tối thiểu
                </label>
                <input
                  type="number"
                  value={roomForm.capacity}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, capacity: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-gray-50"
                  min={1}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Loại phòng
                </label>
                <select
                  value={roomForm.type}
                  onChange={(e) =>
                    setRoomForm({ ...roomForm, type: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-gray-50"
                >
                  <option value="">Bất kỳ</option>
                  <option value="ly_thuyet">📖 Lý thuyết</option>
                  <option value="thuc_hanh">💻 Thực hành</option>
                  <option value="hoi_truong">🎭 Hội trường</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Ngày
                  </label>
                  <input
                    type="date"
                    value={roomForm.date}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, date: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Giờ
                  </label>
                  <input
                    type="time"
                    value={roomForm.time}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, time: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 bg-gray-50"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={roomLoading}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                style={{
                  background: roomLoading
                    ? "#86efac"
                    : "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
                }}
              >
                {roomLoading ? "🔍 Đang tìm..." : "🔍 Tìm phòng"}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-green-50">
                📋
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">
                  Kết quả tìm kiếm
                </h2>
                <p className="text-xs text-gray-400">
                  Phòng phù hợp với yêu cầu
                </p>
              </div>
            </div>
            {roomResult ? (
              <div className="space-y-4">
                {roomResult.rooms?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Phòng phù hợp:
                    </p>
                    {roomResult.rooms.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100"
                      >
                        <span className="text-sm font-black text-green-700">
                          {r.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          {r.building_code} / T{r.floor_number}
                        </span>
                        <span className="text-xs font-bold text-green-600">
                          👥 {r.capacity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {roomResult.response && (
                  <ResultBox content={roomResult.response} />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-200">
                <Search size={48} className="mb-3" />
                <p className="text-sm">Kết quả sẽ hiện ở đây</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
