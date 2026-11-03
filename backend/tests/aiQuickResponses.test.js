const test = require("node:test");
const assert = require("node:assert/strict");

let geminiCalls = 0;
let completedCases = [];
let deviceRows = [];

function mockModule(path, exports) {
  const filename = require.resolve(path);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

mockModule("../src/config/gemini", {
  generateContent: async () => {
    geminiCalls += 1;
    const error = new Error("Service unavailable");
    error.code = "GEMINI_TEMPORARILY_UNAVAILABLE";
    throw error;
  },
});
mockModule("../src/config/database", {
  query: async (sql) => {
    if (sql.includes("FROM Maintenance m") && sql.includes("m.notes")) {
      return [completedCases];
    }
    if (sql.includes("FROM Devices d") && sql.includes("SELECT d.name, d.status")) {
      return [deviceRows];
    }
    if (sql.includes("FROM Devices") && sql.includes("AS broken")) {
      return [[{ total: 240, active: 92, off: 147, broken: 1, repairing: 0 }]];
    }
    if (sql.includes("INSERT INTO AIAnalysis")) return [{ insertId: 1 }];
    throw new Error(`Unexpected query: ${sql}`);
  },
});
mockModule("../src/models/roomModel", {
  getStats: async () => ({
    total: 40,
    trong: 34,
    dang_hoc: 5,
    bao_tri: 0,
    su_co: 1,
    ngat_dien: 2,
  }),
});
mockModule("../src/services/roomOperationalStatusService", {});
mockModule("../src/services/automaticIncidentAlertService", {});

const aiController = require("../src/controllers/aiController");

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function makeRequest(body) {
  return { body, user: { id: 1 } };
}

test("common projector issue uses a completed matching case without Gemini", async () => {
  geminiCalls = 0;
  completedCases = [
    { description: "Hình ảnh máy chiếu bị mờ", notes: "Đã chỉnh lấy nét." },
  ];
  const res = makeResponse();
  await aiController.suggestMaintenance(
    makeRequest({
      device_name: "máy chiếu A101",
      device_type: "may_chieu",
      last_maintenance: "2026-10-29",
      issue: "hình ảnh mờ",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, "local");
  assert.match(res.body.response, /Đã chỉnh lấy nét/);
  assert.equal(geminiCalls, 0);
});

test("unknown maintenance issue returns a cautious answer on Gemini 503", async () => {
  geminiCalls = 0;
  completedCases = [];
  const res = makeResponse();
  await aiController.suggestMaintenance(
    makeRequest({
      device_name: "loa A101",
      device_type: "loa",
      last_maintenance: "",
      issue: "âm thanh rè không rõ nguyên nhân",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, "fallback");
  assert.match(res.body.response, /Gemini hiện chưa phản hồi/);
  assert.equal(geminiCalls, 1);
});

test("fire incident gives immediate guidance without calling Gemini", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.analyzeIncident(
    makeRequest({ incident_type: "chay", room_code: "A101", description: "Có khói" }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, "local");
  assert.match(res.body.response, /Sơ tán/);
  assert.match(res.body.response, /Nguyên nhân có thể/);
  assert.equal(geminiCalls, 0);
});

test("incident analysis uses the reported electrical overload as an unverified cause", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.analyzeIncident(
    makeRequest({
      incident_type: "chay",
      room_code: "A101",
      description: "quá tải điện",
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.match(res.body.response, /Nguyên nhân có thể: Quá tải điện làm dây dẫn hoặc thiết bị quá nhiệt \(theo mô tả, chưa xác minh\)/);
  assert.equal(geminiCalls, 0);
});

test("complex incident returns labeled guidance when Gemini is unavailable", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.analyzeIncident(
    makeRequest({
      incident_type: "chay",
      room_code: "A101",
      description: "Có khói và nhiều thông tin cần kiểm tra tại hiện trường. ".repeat(5),
    }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, "fallback");
  assert.match(res.body.response, /Gemini hiện chưa phản hồi/);
  assert.equal(geminiCalls, 1);
});

test("room power count reads MySQL stats without Gemini", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.chat(makeRequest({ message: "Có bao nhiêu phòng ngắt điện?" }), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.response, /2 phòng đang ngắt điện/);
  assert.equal(geminiCalls, 0);
});

test("follow-up about a broken device fetches its current name from MySQL", async () => {
  geminiCalls = 0;
  deviceRows = [{
    name: "Máy chiếu A101",
    status: "hong",
    device_type: "may_chieu",
    room_code: "A101",
    building_code: "A",
  }];
  const first = makeResponse();
  await aiController.chat(
    makeRequest({ message: "Bạn cho tôi biết có bao nhiêu thiết bị bị hỏng không?" }),
    first,
  );
  assert.match(first.body.response, /1 thiết bị bị hỏng/);

  const followUp = makeResponse();
  await aiController.chat(
    makeRequest({
      message: "thiết bị đó là gì",
      history: [
        { role: "user", content: "Bạn cho tôi biết có bao nhiêu thiết bị bị hỏng không?" },
        { role: "assistant", content: first.body.response },
      ],
    }),
    followUp,
  );
  assert.equal(followUp.statusCode, 200);
  assert.match(followUp.body.response, /Máy chiếu A101 \(A101, Tòa A\)/);
  assert.equal(geminiCalls, 0);
});

test("chat answers a projector blur guidance question without Gemini", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.chat(
    makeRequest({ message: "Đề xuất bảo trì máy chiếu A101 hình ảnh mờ" }),
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, "local");
  assert.match(res.body.response, /lấy nét/);
  assert.equal(geminiCalls, 0);
});

test("future maintenance date is rejected before any AI request", async () => {
  geminiCalls = 0;
  const res = makeResponse();
  await aiController.suggestMaintenance(
    makeRequest({
      device_name: "máy chiếu A101",
      device_type: "may_chieu",
      last_maintenance: "2099-01-01",
      issue: "hình ảnh mờ",
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(geminiCalls, 0);
});
