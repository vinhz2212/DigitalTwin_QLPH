import { useEffect, useRef, useState } from "react";
import api from "../../services/api";
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eraser,
  LoaderCircle,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

const QUICK_QUESTIONS = [
  "Có bao nhiêu phòng đang trống?",
  "Thiết bị nào đang hỏng?",
  "Sự cố nào đang xảy ra?",
  "Đề xuất lịch bảo trì",
  "Tìm phòng cho 40 người",
];

const INCIDENT_TYPES = {
  chay: "🔥 Cháy",
  mat_dien: "⚡ Mất điện",
  may_chieu_hong: "📽️ Máy chiếu hỏng",
  dieu_hoa_hong: "❄️ Điều hòa hỏng",
  mat_internet: "🌐 Mất Internet",
  qua_tai: "👥 Quá tải",
};

const DEVICE_TYPES = [
  { value: "den", label: "💡 Đèn" },
  { value: "dieu_hoa", label: "❄️ Điều hòa" },
  { value: "may_chieu", label: "📽️ Máy chiếu" },
  { value: "quat", label: "🌀 Quạt" },
  { value: "loa", label: "🔊 Loa" },
  { value: "may_tinh", label: "💻 Máy tính" },
];

const ROOM_TYPES = [
  { value: "", label: "Bất kỳ loại phòng" },
  { value: "ly_thuyet", label: "📖 Lý thuyết" },
  { value: "thuc_hanh", label: "💻 Thực hành" },
  { value: "hoi_truong", label: "🎭 Hội trường" },
];

const STORAGE_KEY = "ai_messages";

function getCurrentTime() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createWelcomeMessage() {
  return {
    role: "assistant",
    content:
      "Xin chào! Tôi là trợ lý AI của Smart Campus.\n\nTôi có thể giúp bạn phân tích sự cố, tìm phòng học phù hợp, đề xuất bảo trì thiết bị hoặc trả lời câu hỏi về hệ thống.\n\nBạn muốn bắt đầu với việc gì?",
    time: getCurrentTime(),
  };
}

function loadSavedMessages() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return [createWelcomeMessage()];

    const parsed = JSON.parse(saved);
    if (
      !Array.isArray(parsed) ||
      !parsed.every(
        (message) =>
          message &&
          ["assistant", "user"].includes(message.role) &&
          typeof message.content === "string",
      )
    ) {
      return [createWelcomeMessage()];
    }

    return parsed.length > 0 ? parsed : [createWelcomeMessage()];
  } catch {
    return [createWelcomeMessage()];
  }
}

function MessageText({ content }) {
  return (
    <div className="space-y-1.5 break-words text-sm leading-6">
      {String(content || "")
        .split("\n")
        .map((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={index} className="h-1" />;
          }

          if (trimmed.startsWith("##") || trimmed.startsWith("**")) {
            return (
              <p key={index} className="font-bold">
                {trimmed.replace(/\*\*/g, "").replace(/#/g, "").trim()}
              </p>
            );
          }

          if (/^[•*-]\s/.test(trimmed)) {
            return (
              <p key={index} className="pl-2">
                <span className="mr-1">•</span>
                {trimmed.replace(/^[•*-]\s*/, "")}
              </p>
            );
          }

          return <p key={index}>{trimmed}</p>;
        })}
    </div>
  );
}

function MessageBubble({ message }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`flex items-end gap-2.5 sm:gap-3 ${
        isAssistant ? "" : "flex-row-reverse"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          isAssistant
            ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {isAssistant ? <Bot size={16} /> : <User size={16} />}
      </div>

      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${
          isAssistant
            ? "rounded-bl-md border border-slate-100 bg-white text-slate-700"
            : "rounded-br-md bg-blue-600 text-white"
        }`}
      >
        <MessageText content={message.content} />
        <p
          className={`mt-2 flex items-center gap-1 text-[11px] ${
            isAssistant ? "text-slate-400" : "text-blue-100"
          }`}
        >
          <Clock3 size={11} />
          {message.time || ""}
        </p>
      </div>
    </div>
  );
}

function ResultContent({ content }) {
  if (!content) return null;

  return (
    <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <MessageText content={content} />
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="mb-5 flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon size={19} />
      </span>
      <div>
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50";

function ResultPanel({ title, description, icon: Icon, children }) {
  return (
    <section className="min-h-[280px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <SectionHeading icon={Icon} title={title} description={description} />
      {children}
    </section>
  );
}

function EmptyResult({ icon: Icon = Sparkles, text }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center text-slate-400">
      <Icon size={34} className="mb-3 text-slate-300" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function AIAssistant() {
  const [messages, setMessages] = useState(loadSavedMessages);
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
  const [incidentError, setIncidentError] = useState("");
  const [incidentLoading, setIncidentLoading] = useState(false);

  const [maintenanceForm, setMaintenanceForm] = useState({
    device_name: "",
    device_type: "den",
    last_maintenance: "",
    issue: "",
  });
  const [maintenanceResult, setMaintenanceResult] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const [roomForm, setRoomForm] = useState({
    capacity: 40,
    type: "",
    time: "",
    date: "",
  });
  const [roomResult, setRoomResult] = useState(null);
  const [roomError, setRoomError] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn("Không thể lưu lịch sử chat:", error);
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addAssistantMessage = (content) => {
    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content,
        time: getCurrentTime(),
      },
    ]);
  };

  const handleSend = async (event) => {
    event?.preventDefault();

    const message = input.trim();
    if (!message || loading) return;

    const userMessage = {
      role: "user",
      content: message,
      time: getCurrentTime(),
    };

    const history = messages.map(({ role, content }) => ({ role, content }));

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post("/ai/chat", { message, history });
      const answer = response.data?.response;

      addAssistantMessage(
        answer || "AI chưa trả về nội dung. Bạn thử gửi lại câu hỏi nhé.",
      );
    } catch (error) {
      const messageFromServer = error.response?.data?.message;
      addAssistantMessage(
        messageFromServer ||
          "Mình chưa thể trả lời lúc này. Bạn kiểm tra kết nối rồi thử lại nhé.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const welcome = createWelcomeMessage();
    setMessages([welcome]);
    setInput("");

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([welcome]));
    } catch (error) {
      console.warn("Không thể xóa lịch sử chat đã lưu:", error);
    }
  };

  const handleAnalyzeIncident = async (event) => {
    event.preventDefault();
    setIncidentLoading(true);
    setIncidentError("");
    setIncidentResult("");

    try {
      const response = await api.post("/ai/analyze-incident", incidentForm);
      setIncidentResult(
        response.data?.response || "AI chưa trả về nội dung phân tích.",
      );
    } catch (error) {
      setIncidentError(
        error.response?.data?.message ||
          "Không thể phân tích sự cố. Vui lòng thử lại.",
      );
    } finally {
      setIncidentLoading(false);
    }
  };

  const handleSuggestMaintenance = async (event) => {
    event.preventDefault();
    setMaintenanceLoading(true);
    setMaintenanceError("");
    setMaintenanceResult("");

    try {
      const response = await api.post(
        "/ai/suggest-maintenance",
        maintenanceForm,
      );
      setMaintenanceResult(
        response.data?.response || "AI chưa trả về đề xuất bảo trì.",
      );
    } catch (error) {
      setMaintenanceError(
        error.response?.data?.message ||
          "Không thể tạo đề xuất bảo trì. Vui lòng thử lại.",
      );
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleFindRoom = async (event) => {
    event.preventDefault();
    setRoomLoading(true);
    setRoomError("");
    setRoomResult(null);

    try {
      const response = await api.post("/ai/find-room", {
        ...roomForm,
        capacity: Number(roomForm.capacity),
      });
      setRoomResult(response.data);
    } catch (error) {
      setRoomError(
        error.response?.data?.message ||
          "Không thể tìm phòng. Vui lòng thử lại.",
      );
    } finally {
      setRoomLoading(false);
    }
  };

  const tabs = [
    { id: "chat", icon: MessageSquare, label: "Chat AI" },
    { id: "incident", icon: AlertTriangle, label: "Phân tích sự cố" },
    { id: "maintenance", icon: Wrench, label: "Bảo trì thiết bị" },
    { id: "room", icon: Search, label: "Tìm phòng" },
  ];

  const renderError = (message) =>
    message ? (
      <div
        role="alert"
        className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {message}
      </div>
    ) : null;

  const renderSubmitButton = (isLoading, idleText, loadingText, tone) => {
    const colors = {
      red: "bg-red-600 hover:bg-red-700 focus:ring-red-100",
      amber: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-100",
      green: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-100",
    };

    return (
      <button
        type="submit"
        disabled={isLoading}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${colors[tone]}`}
      >
        {isLoading ? (
          <>
            <LoaderCircle size={17} className="animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            {idleText}
            <ChevronRight size={17} />
          </>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5 pb-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Sparkles size={14} />
            Trợ lý cho Smart Campus
          </div>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            AI Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hỏi về hệ thống, phân tích sự cố hoặc tìm phòng phù hợp.
          </p>
        </div>
      </header>

      <nav
        aria-label="Chức năng AI"
        className="flex w-full gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:px-4 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "chat" && (
        <section className="flex h-[min(68vh,760px)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Trò chuyện với AI
                </p>
                <p className="text-xs text-slate-400">
                  Lịch sử được lưu trong phiên trình duyệt này
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearChat}
              title="Xóa cuộc trò chuyện"
              aria-label="Xóa cuộc trò chuyện"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <Eraser size={15} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>

          <div
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-5"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.time || "message"}-${index}`}
                message={message}
              />
            ))}

            {loading && (
              <div className="flex items-end gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Bot size={16} />
                </span>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  <LoaderCircle
                    size={15}
                    className="animate-spin text-blue-600"
                  />
                  AI đang trả lời...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => setInput(question)}
                  className="shrink-0 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
                >
                  {question}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhập câu hỏi của bạn..."
                aria-label="Câu hỏi cho AI"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Gửi câu hỏi"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}
              </button>
            </form>
          </div>
        </section>
      )}

      {activeTab === "incident" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={AlertTriangle}
              title="Phân tích sự cố"
              description="Nhập thông tin để AI đề xuất hướng xử lý."
              tone="red"
            />

            {renderError(incidentError)}

            <form onSubmit={handleAnalyzeIncident} className="space-y-4">
              <FormField label="Loại sự cố">
                <select
                  value={incidentForm.incident_type}
                  onChange={(event) =>
                    setIncidentForm((previous) => ({
                      ...previous,
                      incident_type: event.target.value,
                    }))
                  }
                  className={inputClassName}
                >
                  {Object.entries(INCIDENT_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Mã phòng">
                <input
                  type="text"
                  value={incidentForm.room_code}
                  onChange={(event) =>
                    setIncidentForm((previous) => ({
                      ...previous,
                      room_code: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: A101"
                  className={inputClassName}
                  required
                />
              </FormField>

              <FormField label="Mô tả chi tiết">
                <textarea
                  value={incidentForm.description}
                  onChange={(event) =>
                    setIncidentForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Mô tả tình trạng đang xảy ra..."
                  className={`${inputClassName} resize-y`}
                  required
                />
              </FormField>

              {renderSubmitButton(
                incidentLoading,
                "Phân tích sự cố",
                "Đang phân tích...",
                "red",
              )}
            </form>
          </section>

          <ResultPanel
            title="Kết quả phân tích"
            description="Nguyên nhân và hướng xử lý đề xuất"
            icon={Sparkles}
          >
            {incidentResult ? (
              <ResultContent content={incidentResult} />
            ) : (
              <EmptyResult
                icon={AlertTriangle}
                text="Kết quả phân tích sẽ xuất hiện tại đây."
              />
            )}
          </ResultPanel>
        </div>
      )}

      {activeTab === "maintenance" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={Wrench}
              title="Đề xuất bảo trì"
              description="Mô tả thiết bị và vấn đề cần xử lý."
              tone="amber"
            />

            {renderError(maintenanceError)}

            <form onSubmit={handleSuggestMaintenance} className="space-y-4">
              <FormField label="Tên thiết bị">
                <input
                  type="text"
                  value={maintenanceForm.device_name}
                  onChange={(event) =>
                    setMaintenanceForm((previous) => ({
                      ...previous,
                      device_name: event.target.value,
                    }))
                  }
                  placeholder="Ví dụ: Máy chiếu phòng A101"
                  className={inputClassName}
                  required
                />
              </FormField>

              <FormField label="Loại thiết bị">
                <select
                  value={maintenanceForm.device_type}
                  onChange={(event) =>
                    setMaintenanceForm((previous) => ({
                      ...previous,
                      device_type: event.target.value,
                    }))
                  }
                  className={inputClassName}
                >
                  {DEVICE_TYPES.map((device) => (
                    <option key={device.value} value={device.value}>
                      {device.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Ngày bảo trì gần nhất">
                <input
                  type="date"
                  value={maintenanceForm.last_maintenance}
                  onChange={(event) =>
                    setMaintenanceForm((previous) => ({
                      ...previous,
                      last_maintenance: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </FormField>

              <FormField label="Vấn đề hiện tại">
                <textarea
                  value={maintenanceForm.issue}
                  onChange={(event) =>
                    setMaintenanceForm((previous) => ({
                      ...previous,
                      issue: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Mô tả dấu hiệu hoặc lỗi của thiết bị..."
                  className={`${inputClassName} resize-y`}
                  required
                />
              </FormField>

              {renderSubmitButton(
                maintenanceLoading,
                "Đề xuất bảo trì",
                "Đang tạo đề xuất...",
                "amber",
              )}
            </form>
          </section>

          <ResultPanel
            title="Đề xuất từ AI"
            description="Các bước bảo trì và lịch dự kiến"
            icon={Wrench}
          >
            {maintenanceResult ? (
              <ResultContent content={maintenanceResult} />
            ) : (
              <EmptyResult
                icon={Wrench}
                text="Đề xuất bảo trì sẽ xuất hiện tại đây."
              />
            )}
          </ResultPanel>
        </div>
      )}

      {activeTab === "room" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={Building2}
              title="Tìm phòng phù hợp"
              description="Chọn sức chứa và điều kiện sử dụng."
              tone="green"
            />

            {renderError(roomError)}

            <form onSubmit={handleFindRoom} className="space-y-4">
              <FormField label="Sức chứa tối thiểu">
                <input
                  type="number"
                  min="1"
                  value={roomForm.capacity}
                  onChange={(event) =>
                    setRoomForm((previous) => ({
                      ...previous,
                      capacity: event.target.value,
                    }))
                  }
                  className={inputClassName}
                  required
                />
              </FormField>

              <FormField label="Loại phòng">
                <select
                  value={roomForm.type}
                  onChange={(event) =>
                    setRoomForm((previous) => ({
                      ...previous,
                      type: event.target.value,
                    }))
                  }
                  className={inputClassName}
                >
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType.value} value={roomType.value}>
                      {roomType.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Ngày cần phòng">
                  <input
                    type="date"
                    value={roomForm.date}
                    onChange={(event) =>
                      setRoomForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Giờ bắt đầu">
                  <input
                    type="time"
                    value={roomForm.time}
                    onChange={(event) =>
                      setRoomForm((previous) => ({
                        ...previous,
                        time: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                </FormField>
              </div>

              {renderSubmitButton(
                roomLoading,
                "Tìm phòng",
                "Đang tìm phòng...",
                "green",
              )}
            </form>
          </section>

          <ResultPanel
            title="Kết quả tìm phòng"
            description="Các phòng trống phù hợp với yêu cầu"
            icon={Search}
          >
            {roomResult ? (
              <div className="space-y-4">
                {Array.isArray(roomResult.rooms) &&
                roomResult.rooms.length > 0 ? (
                  <div className="space-y-2">
                    {roomResult.rooms.map((room) => (
                      <div
                        key={room.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3"
                      >
                        <div>
                          <p className="font-bold text-emerald-800">
                            {room.code}
                          </p>
                          <p className="text-xs text-slate-500">
                            {room.building_code
                              ? `${room.building_code} · `
                              : ""}
                            Tầng {room.floor_number}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                          {room.capacity} chỗ
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Không tìm thấy phòng trống phù hợp với sức chứa đã chọn.
                  </p>
                )}

                {roomResult.response && (
                  <ResultContent content={roomResult.response} />
                )}
              </div>
            ) : (
              <EmptyResult
                icon={CircleHelp}
                text="Kết quả tìm phòng sẽ xuất hiện tại đây."
              />
            )}
          </ResultPanel>
        </div>
      )}
    </div>
  );
}
