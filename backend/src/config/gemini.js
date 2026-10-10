const axios = require("axios");

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

// These model IDs are listed as stable Gemini API models.
const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

const SYSTEM_INSTRUCTION = `Bạn là AI Assistant của hệ thống Smart Campus Digital Twin.
Bạn hỗ trợ quản lý phòng học, thiết bị và sự cố tại trường đại học.
Hệ thống có 2 tòa nhà (A, B), mỗi tòa 5 tầng, mỗi tầng 4 phòng, tổng 40 phòng học.
Mỗi phòng có 6 thiết bị: đèn, điều hòa, máy chiếu, quạt, loa, máy tính.
Trả lời ngắn gọn, chuyên nghiệp bằng tiếng Việt.
Khi phân tích sự cố, đưa ra các bước xử lý cụ thể.
Khi đề xuất bảo trì, chỉ xem đó là phương án tham khảo, không khẳng định lịch đã được đặt hoặc phê duyệt.
Không tự bịa ngày, thứ, giờ, thời lượng, số thiết bị mỗi ngày hoặc mã phòng nếu dữ liệu không có.
Trạng thái thiết bị "tắt" chỉ có nghĩa là đang tắt, không đồng nghĩa với hỏng hoặc cần bảo trì.
Nếu dữ liệu không có lịch bảo trì đã lên kế hoạch, hãy nói rõ và trình bày các bước triển khai theo thứ tự thay vì tự đặt lịch cụ thể.
Khi trả lời tiếp câu hỏi trong cùng cuộc hội thoại, giữ nhất quán với nội dung đã nói trước đó; nếu câu trước thiếu dữ liệu thì phải đính chính rõ, không biến đề xuất thành lịch đã xác nhận.`;

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 30000;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createGeminiError(code, message, statusCode, publicMessage) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function getRetryDelay(error, attempt) {
  const retryAfter = Number(error.response?.headers?.["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 8000);
  }

  return 700 * 2 ** attempt + Math.floor(Math.random() * 300);
}

function isRetryable(error) {
  const status = error.response?.status;
  const networkCode = error.code;

  return (
    [408, 429, 500, 502, 503, 504].includes(status) ||
    ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(
      networkCode,
    )
  );
}

function normalizeGeminiError(error) {
  const status = error.response?.status;
  const providerMessage =
    error.response?.data?.error?.message || error.message || "Lỗi không xác định";
  const safeMessage = GEMINI_API_KEY
    ? providerMessage.split(GEMINI_API_KEY).join("[REDACTED]")
    : providerMessage;
  const invalidKey =
    /api key.{0,30}(invalid|not valid|expired|blocked)|(?:invalid|not valid|expired|blocked).{0,30}api key/i.test(
      safeMessage,
    );

  if (invalidKey || status === 401) {
    return createGeminiError(
      "GEMINI_KEY_INVALID",
      safeMessage,
      503,
      "Gemini từ chối API key. Hãy kiểm tra trạng thái key trong Google AI Studio rồi cập nhật backend/.env.",
    );
  }

  if (status === 403) {
    return createGeminiError(
      "GEMINI_KEY_PERMISSION",
      safeMessage,
      503,
      "API key chưa có quyền dùng Gemini API hoặc bị giới hạn. Hãy kiểm tra quyền của key trong Google AI Studio.",
    );
  }

  if (status === 402) {
    return createGeminiError(
      "GEMINI_BILLING_REQUIRED",
      safeMessage,
      503,
      "Dịch vụ Gemini yêu cầu kiểm tra thanh toán hoặc hạn mức của dự án.",
    );
  }

  if (status === 429) {
    return createGeminiError(
      "GEMINI_RATE_LIMIT",
      safeMessage,
      503,
      "Gemini đang giới hạn số lượt gọi hoặc đã hết quota tạm thời. Vui lòng đợi rồi thử lại.",
    );
  }

  if (isRetryable(error)) {
    return createGeminiError(
      "GEMINI_TEMPORARILY_UNAVAILABLE",
      safeMessage,
      503,
      "Dịch vụ Gemini hoặc kết nối mạng đang tạm thời không ổn định. Vui lòng thử lại sau.",
    );
  }

  return createGeminiError(
    "GEMINI_REQUEST_FAILED",
    safeMessage,
    502,
    "Gemini không xử lý được yêu cầu này. Vui lòng thử lại sau.",
  );
}

function extractCandidate(response) {
  const candidate = response.data?.candidates?.[0];
  const text = (candidate?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw createGeminiError(
      "GEMINI_EMPTY_RESPONSE",
      "Gemini returned no text candidate.",
      502,
      "AI chưa tạo được câu trả lời cho yêu cầu này. Hãy thử diễn đạt lại câu hỏi.",
    );
  }

  return { text, finishReason: candidate.finishReason };
}

const generateContent = async (prompt, { history = [], context = "" } = {}) => {
  if (!GEMINI_API_KEY) {
    throw createGeminiError(
      "GEMINI_KEY_MISSING",
      "GEMINI_API_KEY is not configured.",
      503,
      "Backend chưa nạp được GEMINI_API_KEY. Kiểm tra biến này trong backend/.env rồi khởi động lại backend.",
    );
  }

  const contents = history
    .filter(
      (turn) =>
        turn &&
        ["user", "assistant"].includes(turn.role) &&
        typeof turn.content === "string" &&
        turn.content.trim(),
    )
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content.trim() }],
    }));

  // Gemini expects the first conversational turn to come from the user.
  while (contents[0]?.role === "model") contents.shift();
  contents.push({ role: "user", parts: [{ text: prompt }] });
  const systemInstruction = [SYSTEM_INSTRUCTION, context]
    .filter(Boolean)
    .join("\n\n");

  let lastUnavailableModelError;
  let lastTransientError;

  for (const modelName of MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        let continuationContents = contents;
        let completeText = "";

        for (let continuation = 0; continuation < 3; continuation += 1) {
          const response = await axios.post(
            url,
            {
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: continuationContents,
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 1600,
              },
            },
            {
              timeout: REQUEST_TIMEOUT_MS,
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
              },
            },
          );

          const candidate = extractCandidate(response);
          completeText = [completeText, candidate.text].filter(Boolean).join("\n");

          if (candidate.finishReason !== "MAX_TOKENS") {
            return completeText.trim();
          }

          continuationContents = [
            ...continuationContents,
            { role: "model", parts: [{ text: candidate.text }] },
            {
              role: "user",
              parts: [
                {
                  text: "Hãy tiếp tục đúng từ chỗ đang dở, không lặp lại phần đã trả lời; hoàn thành đầy đủ các ý còn lại rồi kết thúc câu trả lời.",
                },
              ],
            },
          ];
        }

        return completeText.trim();
      } catch (error) {
        if (error.code?.startsWith("GEMINI_")) {
          throw error;
        }

        const status = error.response?.status;
        const providerMessage = error.response?.data?.error?.message || error.message;
        const safeProviderMessage = GEMINI_API_KEY
          ? String(providerMessage).split(GEMINI_API_KEY).join("[REDACTED]")
          : String(providerMessage);

        console.error("Gemini request failed:", {
          model: modelName,
          status: status || null,
          code: error.code || null,
          message: safeProviderMessage,
          attempt: attempt + 1,
        });

        // Model không tồn tại/không được hỗ trợ: thử model dự phòng ngay.
        if (status === 404) {
          lastUnavailableModelError = error;
          break;
        }

        // Với lỗi tạm thời, retry cùng model trước; hết lượt mới chuyển model.
        if (isRetryable(error) && attempt < MAX_RETRIES) {
          await wait(getRetryDelay(error, attempt));
          continue;
        }

        if ([502, 503, 504].includes(status)) {
          lastTransientError = error;
          break;
        }

        throw normalizeGeminiError(error);
      }
    }
  }

  // Ưu tiên báo lỗi quá tải nếu có model bị quá tải, kể cả model dự phòng
  // phía sau trả 404.
  if (lastTransientError) {
    throw normalizeGeminiError(lastTransientError);
  }

  if (lastUnavailableModelError) {
    throw createGeminiError(
      "GEMINI_MODELS_UNAVAILABLE",
      lastUnavailableModelError.response?.data?.error?.message ||
        "No configured Gemini model is available.",
      503,
      "Các model Gemini hiện không khả dụng với dự án này. Kiểm tra quyền API/model hoặc thử lại sau.",
    );
  }

  throw createGeminiError(
    "GEMINI_MODELS_UNAVAILABLE",
    "No configured Gemini model is available.",
    503,
    "Các model Gemini hiện không khả dụng với dự án này. Kiểm tra quyền API/model hoặc thử lại sau.",
  );
};

module.exports = { generateContent };
