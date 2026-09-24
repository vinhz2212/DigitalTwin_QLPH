const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  timezone: "+07:00", // Múi giờ Việt Nam
});

const db = pool.promise();

// Test kết nối
pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Kết nối database thất bại:", err.message);
    return;
  }
  console.log("✅ Kết nối MySQL 8.0 thành công!");
  connection.release();
});

module.exports = db;
