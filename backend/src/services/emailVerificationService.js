const crypto = require("crypto");
const nodemailer = require("nodemailer");

const VERIFICATION_LIFETIME_MS = 10 * 60 * 1000;

const hashVerificationCode = (email, code) => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET chưa được cấu hình");
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
};

const createVerificationCode = (email) => {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  return {
    code,
    hash: hashVerificationCode(email, code),
    expiresAt: new Date(Date.now() + VERIFICATION_LIFETIME_MS),
  };
};

const isValidVerificationCode = (code) =>
  typeof code === "string" && /^\d{6}$/.test(code);

const sendVerificationEmail = async (email, code) => {
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
    subject: "Mã xác minh SmartCampus",
    text: `Mã xác minh email SmartCampus của bạn là: ${code}\n\nMã có hiệu lực trong 10 phút và chỉ dùng một lần. Không chia sẻ mã này với người khác.\n\nNếu bạn không yêu cầu xác minh, hãy bỏ qua email này.`,
  });
};

module.exports = {
  createVerificationCode,
  hashVerificationCode,
  isValidVerificationCode,
  sendVerificationEmail,
};
