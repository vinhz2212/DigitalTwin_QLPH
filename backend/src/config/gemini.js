const axios = require("axios");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_INSTRUCTION = `Bạn là AI Assistant của hệ thống Smart Campus Digital Twin.
Bạn hỗ trợ quản lý phòng học, thiết bị và sự cố tại trường đại học.
Hệ thống có 2 tòa nhà (A, B), mỗi tòa 5 tầng, mỗi tầng 4 phòng, tổng 40 phòng học.
Mỗi phòng có 6 thiết bị: đèn, điều hòa, máy chiếu, quạt, loa, máy tính.
Trả lời ngắn gọn, chuyên nghiệp bằng tiếng Việt.
Khi phân tích sự cố, đưa ra các bước xử lý cụ thể.
Khi đề xuất bảo trì, đưa ra lịch bảo trì hợp lý.`;

const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
];

const generateContent = async (prompt) => {
  const contents = [
    {
      role: "user",
      parts: [{ text: SYSTEM_INSTRUCTION + "\n\n" + prompt }],
    },
  ];

  for (const modelName of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

      const res = await axios.post(
        url,
        {
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        },
        {
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY, // ✅ Dùng header thay vì ?key=
          },
        },
      );

      console.log(`✅ Model ${modelName} thành công!`);
      return res.data.candidates[0].content.parts[0].text;
    } catch (err) {
      const status = err.response?.status;
      const errMsg = err.response?.data?.error?.message || "";
      console.log(`⚠️ Model ${modelName} thất bại (${status}) — ${errMsg}`);
      if (status !== 503 && status !== 404 && status !== 429) throw err;
    }
  }

  throw new Error("Tất cả model đều không khả dụng. Vui lòng thử lại sau!");
};

module.exports = { generateContent };
