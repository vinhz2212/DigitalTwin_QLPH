const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// Luôn tải file .env nằm cạnh index.js, không phụ thuộc terminal chạy từ đâu.
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Import database
require("./src/config/database");

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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

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

// Test route
app.get("/", (req, res) => {
  res.json({ message: "✅ Smart Campus API đang chạy!" });
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("✅ Client kết nối:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client ngắt kết nối:", socket.id);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
