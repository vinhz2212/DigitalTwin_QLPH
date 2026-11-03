const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
process.env.JWT_SECRET ||= "email-verification-test-secret";

function mockModule(path, exports) {
  const filename = require.resolve(path);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}

const realVerificationService = require("../src/services/emailVerificationService");
let deliveredEmails = [];
let failDelivery = false;
let storedTokenHash = null;
let storedAttempts = 0;
let storedExpiresAt = null;
let verified = false;
let transaction;

mockModule("../src/services/emailVerificationService", {
  ...realVerificationService,
  sendVerificationEmail: async (email, code) => {
    if (failDelivery) throw new Error("SMTP unavailable");
    deliveredEmails.push({ email, code });
  },
});
mockModule("../src/services/passwordResetService", {
  isMailConfigured: () => true,
  passwordVersion: () => "version",
});
mockModule("../src/models/logModel", { create: async () => 1 });
mockModule("../src/config/database", {
  query: async (sql, params) => {
    if (sql.includes("SELECT u.*, r.name AS role_name")) {
      return [[{
        id: 1,
        username: "student",
        email: "student@example.com",
        password_hash: bcrypt.hashSync("correct-password", 4),
        email_verified_at: null,
        role_name: "giang_vien",
      }]];
    }
    if (sql.includes("SELECT u.id, u.role_id, u.password_hash, u.email_verified_at")) {
      return [[{
        id: 1,
        role_id: 2,
        role: "giang_vien",
        password_hash: "hash",
        email_verified_at: null,
      }]];
    }
    if (sql.includes("SELECT id FROM Users WHERE username")) return [[]];
    if (sql.includes("SELECT id FROM Users WHERE email")) return [[]];
    if (sql.includes("SELECT id FROM Roles")) return [[{ id: 2 }]];
    if (sql.includes("SELECT id, email, email_verification_token_hash")) {
      return [[{
        id: 8,
        email: registration.email,
        email_verification_token_hash: storedTokenHash,
        email_verification_expires_at: storedExpiresAt,
        email_verification_attempts: storedAttempts,
      }]];
    }
    if (sql.includes("UPDATE Users") && sql.includes("email_verified_at = NOW()")) {
      const valid = !verified && storedAttempts < 5 && storedTokenHash === params[1];
      if (valid) {
        verified = true;
        storedTokenHash = null;
        storedAttempts = 0;
      }
      return [{ affectedRows: valid ? 1 : 0 }];
    }
    if (sql.includes("email_verification_attempts = email_verification_attempts + 1")) {
      if (!verified && storedAttempts < 5 && storedTokenHash !== params[1]) storedAttempts += 1;
      return [{ affectedRows: 1 }];
    }
    if (sql.includes("UPDATE Users") && sql.includes("email_verification_attempts = 0")) {
      storedTokenHash = params[0];
      storedExpiresAt = params[1];
      storedAttempts = 0;
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected query: ${sql}`);
  },
  getConnection: async () => {
    transaction = { committed: false, rolledBack: false, released: false };
    return {
      beginTransaction: async () => {},
      query: async (sql, params) => {
        if (!sql.includes("INSERT INTO Users")) throw new Error(`Unexpected query: ${sql}`);
        storedTokenHash = params[6];
        storedExpiresAt = params[7];
        storedAttempts = 0;
        verified = false;
        return [{ insertId: 8 }];
      },
      commit: async () => { transaction.committed = true; },
      rollback: async () => { transaction.rolledBack = true; },
      release: () => { transaction.released = true; },
    };
  },
});

const authController = require("../src/controllers/authController");
const authMiddleware = require("../src/middleware/auth");

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function makeRequest(body) {
  return { body, ip: "127.0.0.1", app: { get: () => null } };
}

const registration = {
  full_name: "Nguyễn Văn A",
  username: "student",
  email: "student@example.com",
  password: "correct-password",
};

test("registration sends a six-digit one-time code before enabling the account", async () => {
  failDelivery = false;
  deliveredEmails = [];
  const res = makeResponse();
  await authController.register(makeRequest(registration), res);
  assert.equal(res.statusCode, 201);
  assert.equal(transaction.committed, true);
  assert.equal(deliveredEmails.length, 1);
  assert.equal(deliveredEmails[0].email, registration.email);
  assert.match(deliveredEmails[0].code, /^\d{6}$/);
  assert.equal(storedTokenHash, realVerificationService.hashVerificationCode(registration.email, deliveredEmails[0].code));
  assert.ok(storedExpiresAt.getTime() - Date.now() <= 10 * 60 * 1000);

  const first = makeResponse();
  await authController.verifyEmail(makeRequest({ email: registration.email, code: deliveredEmails[0].code }), first);
  assert.equal(first.statusCode, 200);

  const second = makeResponse();
  await authController.verifyEmail(makeRequest({ email: registration.email, code: deliveredEmails[0].code }), second);
  assert.equal(second.statusCode, 400);
});

test("five incorrect codes block verification even with the correct code", async () => {
  deliveredEmails = [];
  const registrationResponse = makeResponse();
  await authController.register(makeRequest(registration), registrationResponse);
  assert.equal(registrationResponse.statusCode, 201);
  const correctCode = deliveredEmails.at(-1).code;
  const wrongCode = correctCode === "000000" ? "000001" : "000000";
  for (let i = 0; i < 5; i += 1) {
    const response = makeResponse();
    await authController.verifyEmail(makeRequest({ email: registration.email, code: wrongCode }), response);
    assert.equal(response.statusCode, 400);
  }
  assert.equal(storedAttempts, 5);
  const blocked = makeResponse();
  await authController.verifyEmail(makeRequest({ email: registration.email, code: correctCode }), blocked);
  assert.equal(blocked.statusCode, 400);

  const resend = makeResponse();
  await authController.resendVerification(makeRequest({ email: registration.email }), resend);
  assert.equal(resend.statusCode, 200);
  assert.equal(storedAttempts, 0);
  assert.equal(deliveredEmails.length, 2);
  const afterResend = makeResponse();
  await authController.verifyEmail(
    makeRequest({ email: registration.email, code: deliveredEmails.at(-1).code }),
    afterResend,
  );
  assert.equal(afterResend.statusCode, 200);
});

test("unverified account cannot log in even with the correct password", async () => {
  const res = makeResponse();
  await authController.login(
    makeRequest({ username: "student", password: "correct-password" }),
    res,
  );
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "EMAIL_NOT_VERIFIED");
  assert.equal(res.body.token, undefined);
});

test("an existing session cannot access APIs after email becomes unverified", async () => {
  const token = jwt.sign({ id: 1, pwdv: "version" }, process.env.JWT_SECRET);
  const res = makeResponse();
  let reachedRoute = false;
  await authMiddleware(
    { headers: { authorization: `Bearer ${token}` } },
    res,
    () => { reachedRoute = true; },
  );
  assert.equal(res.statusCode, 401);
  assert.equal(reachedRoute, false);
});

test("registration rolls back if verification email cannot be sent", async () => {
  failDelivery = true;
  const res = makeResponse();
  await authController.register(makeRequest(registration), res);
  assert.equal(res.statusCode, 503);
  assert.equal(transaction.committed, false);
  assert.equal(transaction.rolledBack, true);
  assert.equal(transaction.released, true);
});
