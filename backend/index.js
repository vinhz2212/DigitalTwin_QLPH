const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const path = require("path");

// Luôn tải file .env nằm cạnh index.js, không phụ thuộc terminal chạy từ đâu.
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Import database
const db = require("./src/config/database");

// Import routes
const authRoutes = require("./src/routes/authRoutes");
const roomRoutes = require("./src/routes/roomRoutes");
const deviceRoutes = require("./src/routes/deviceRoutes");
const incidentRoutes = require("./src/routes/incidentRoutes");
const scheduleRoutes = require("./src/routes/scheduleRoutes");
const userRoutes = require("./src/routes/userRoutes");
const aiRoutes = require("./src/routes/aiRoutes");
const simulationRoutes = require("./src/routes/simulationRoutes");
const logRoutes = require("./src/routes/logRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const sensorRoutes = require("./src/routes/sensorRoutes");
const energyRoutes = require("./src/routes/energyRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const statisticsRoutes = require("./src/routes/statisticsRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const auditLog = require("./src/middleware/auditLog");
const {
  reconcileOpenMaintenanceState,
} = require("./src/services/maintenanceStateService");

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin không được phép truy cập API."));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

const io = new Server(server, {
  cors: corsOptions,
});

io.use(async (socket, next) => {
  const bearerToken = socket.handshake.headers.authorization?.match(
    /^Bearer\s+(.+)$/i,
  )?.[1];
  const token = socket.handshake.auth?.token || bearerToken;

  if (!token) return next(new Error("Không có token xác thực"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query(
      `SELECT u.id, r.name AS role
       FROM Users u
       JOIN Roles r ON r.id = u.role_id
       WHERE u.id = ? AND u.is_active = TRUE
       LIMIT 1`,
      [decoded.id],
    );

    if (users.length === 0) {
      return next(new Error("Tài khoản không còn hoạt động"));
    }

    socket.user = users[0];
    return next();
  } catch (error) {
    return next(new Error("Token không hợp lệ"));
  }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(auditLog);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api", incidentRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/simulation", simulationRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/energy", energyRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/reports", reportRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ message: "✅ Smart Campus API đang chạy!" });
});

// Socket.IO
io.on("connection", (socket) => {
  socket.join(`user:${socket.user.id}`);
  socket.join(`role:${socket.user.role}`);
  console.log("✅ Client kết nối:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client ngắt kết nối:", socket.id);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
  reconcileOpenMaintenanceState().catch((error) => {
    console.error("Không thể đồng bộ trạng thái bảo trì:", error.message);
  });
});
