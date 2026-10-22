const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const migrationsDirectory = path.join(__dirname, "..", "database", "migrations");
const statusOnly = process.argv.includes("--status");
const lockName = "smart_campus_schema_migrations";

const requiredEnvironmentVariables = [
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !process.env[name],
);

if (missingEnvironmentVariables.length > 0) {
  console.error(
    `Thiếu biến môi trường: ${missingEnvironmentVariables.join(", ")}.`,
  );
  process.exitCode = 1;
  return;
}

const databaseName = process.env.DB_NAME;

const getMigrationFiles = () =>
  fs
    .readdirSync(migrationsDirectory)
    .filter((fileName) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));

const checksum = (content) =>
  crypto.createHash("sha256").update(content, "utf8").digest("hex");

const createConnection = () =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: databaseName,
    charset: "utf8mb4",
    timezone: "+07:00",
    multipleStatements: true,
    ssl:
      process.env.DB_SSL === "true"
        ? { minVersion: "TLSv1.2" }
        : undefined,
  });

const ensureMigrationTable = (connection) =>
  connection.query(`
    CREATE TABLE IF NOT EXISTS SchemaMigrations (
      name VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

const assertBaselineSchemaExists = async (connection) => {
  const requiredTables = [
    "Roles",
    "Users",
    "Buildings",
    "Floors",
    "Rooms",
    "DeviceTypes",
    "Devices",
    "Incidents",
    "Maintenance",
    "Schedules",
    "Bookings",
    "Notifications",
    "ActivityLogs",
    "AIAnalysis",
    "SensorReadings",
    "EnergyLogs",
  ];
  const placeholders = requiredTables.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME IN (${placeholders})`,
    [databaseName, ...requiredTables],
  );

  if (rows.length !== requiredTables.length) {
    const existingTables = new Set(
      rows.map((row) => String(row.TABLE_NAME).toLowerCase()),
    );
    const missingTables = requiredTables.filter(
      (tableName) => !existingTables.has(tableName.toLowerCase()),
    );
    throw new Error(
      `Database chưa đủ schema, còn thiếu: ${missingTables.join(", ")}. ` +
        "Không ghi nhận baseline cho đến khi các bảng này được bổ sung.",
    );
  }
};

const readAppliedMigrations = async (connection) => {
  const [tableRows] = await connection.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'SchemaMigrations'`,
    [databaseName],
  );

  if (Number(tableRows[0]?.total) === 0) return [];

  const [rows] = await connection.query(
    "SELECT name, checksum, applied_at FROM SchemaMigrations ORDER BY name",
  );
  return rows;
};

const run = async () => {
  const connection = await createConnection();
  let hasLock = false;

  try {
    const files = getMigrationFiles();

    if (statusOnly) {
      const appliedRows = await readAppliedMigrations(connection);
      const appliedNames = new Set(appliedRows.map((row) => row.name));

      if (files.length === 0) {
        console.log("Không có file migration nào.");
        return;
      }

      for (const fileName of files) {
        console.log(
          `${appliedNames.has(fileName) ? "[đã chạy]" : "[chưa chạy]"} ${fileName}`,
        );
      }
      return;
    }

    await ensureMigrationTable(connection);
    const [lockRows] = await connection.query(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [lockName],
    );
    hasLock = Number(lockRows[0]?.acquired) === 1;

    if (!hasLock) {
      throw new Error("Không thể khóa migration. Có tiến trình khác đang chạy.");
    }

    const [appliedRows] = await connection.query(
      "SELECT name, checksum, applied_at FROM SchemaMigrations ORDER BY name",
    );
    const applied = new Map(appliedRows.map((row) => [row.name, row]));

    let appliedCount = 0;

    for (const fileName of files) {
      const filePath = path.join(migrationsDirectory, fileName);
      const sql = fs.readFileSync(filePath, "utf8").trim();
      const currentChecksum = checksum(sql);
      const existing = applied.get(fileName);

      if (existing) {
        if (existing.checksum !== currentChecksum) {
          throw new Error(
            `Migration ${fileName} đã bị thay đổi sau khi chạy. ` +
              "Hãy khôi phục file cũ và tạo migration mới.",
          );
        }
        continue;
      }

      console.log(`Đang chạy ${fileName}...`);
      if (sql) await connection.query(sql);

      if (fileName === "001_ensure_current_schema.sql") {
        await assertBaselineSchemaExists(connection);
      }

      await connection.query(
        "INSERT INTO SchemaMigrations (name, checksum) VALUES (?, ?)",
        [fileName, currentChecksum],
      );
      appliedCount += 1;
    }

    console.log(
      appliedCount === 0
        ? "Database đã ở phiên bản mới nhất."
        : `Đã chạy thành công ${appliedCount} migration.`,
    );
  } finally {
    if (hasLock) {
      await connection.query("SELECT RELEASE_LOCK(?)", [lockName]);
    }
    await connection.end();
  }
};

run().catch((error) => {
  const nestedMessages = Array.isArray(error?.errors)
    ? error.errors
        .map((item) => item?.message || item?.code)
        .filter(Boolean)
        .join("; ")
    : "";
  const message = error?.message || nestedMessages || error?.code || String(error);
  console.error("Migration thất bại:", message);
  process.exitCode = 1;
});
