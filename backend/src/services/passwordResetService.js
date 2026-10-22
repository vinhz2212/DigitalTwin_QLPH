const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const RESET_EXPIRY = "15m";

const passwordVersion = (passwordHash) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(passwordHash)
    .digest("hex");

const resetSecret = (passwordHash) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`password-reset:${passwordHash}`)
    .digest("hex");

const createResetToken = (user) =>
  jwt.sign(
    {
      sub: String(user.id),
      purpose: "password_reset",
      jti: crypto.randomUUID(),
    },
    resetSecret(user.password_hash),
    { algorithm: "HS256", expiresIn: RESET_EXPIRY },
  );

const readResetUserId = (token) => {
  if (typeof token !== "string" || token.length > 4096) return null;
  const payload = jwt.decode(token);
  const userId = Number(payload?.sub);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
};

const verifyResetToken = (token, user) => {
  const payload = jwt.verify(token, resetSecret(user.password_hash), {
    algorithms: ["HS256"],
  });
  return payload.purpose === "password_reset" && payload.sub === String(user.id);
};

const isMailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_APP_PASSWORD,
  );

const sendResetEmail = async (email, token) => {
  const clientOrigin = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")[0]
    .trim();
  const resetUrl = new URL("/reset-password", clientOrigin);
  resetUrl.searchParams.set("token", token);

  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Đặt lại mật khẩu SmartCampus",
    text: `Bạn đã yêu cầu đặt lại mật khẩu SmartCampus. Mở liên kết sau trong vòng 15 phút:\n\n${resetUrl.toString()}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
  });
};

module.exports = {
  passwordVersion,
  createResetToken,
  readResetUserId,
  verifyResetToken,
  isMailConfigured,
  sendResetEmail,
};
