const test = require("node:test");
const assert = require("node:assert/strict");

process.env.GEMINI_API_KEY = "test-only-key";

let responseMode = "fallback";
const calls = [];
const axiosPath = require.resolve("axios");
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: {
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      if (responseMode === "fallback" && calls.length === 1) {
        const error = new Error("High demand");
        error.response = { status: 503, data: { error: { message: "High demand" } } };
        throw error;
      }
      return {
        data: {
          candidates: [{
            content: { parts: [{ text: "Hướng xử lý ngắn gọn." }] },
            finishReason: responseMode === "incomplete" ? "MAX_TOKENS" : "STOP",
          }],
        },
      };
    },
  },
};

const { generateContent } = require("../src/config/gemini");

test("quick mode switches to a second lightweight model after 503", async () => {
  responseMode = "fallback";
  calls.length = 0;
  const answer = await generateContent("Kiểm tra máy chiếu", { mode: "quick" });
  assert.equal(answer, "Hướng xử lý ngắn gọn.");
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /gemini-3\.5-flash-lite/);
  assert.match(calls[1].url, /gemini-3\.1-flash-lite/);
  assert.equal(calls[0].body.generationConfig.maxOutputTokens, 700);
  assert.equal(calls[0].options.timeout, 8000);
});

test("quick mode rejects an unfinished response instead of showing truncated text", async () => {
  responseMode = "incomplete";
  calls.length = 0;
  await assert.rejects(
    generateContent("Kiểm tra máy chiếu", { mode: "quick" }),
    { code: "GEMINI_INCOMPLETE_RESPONSE" },
  );
});
