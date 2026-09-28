// Connection pool MySQL (mysql2/promise). Dibuat lazy agar modul lain bisa diuji tanpa DB.
let pool = null;

function getPool() {
  if (pool) return pool;

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_USER || !DB_NAME) {
    throw new Error("DB_USER dan DB_NAME wajib diisi di .env");
  }

  const mysql = require("mysql2/promise");
  pool = mysql.createPool({
    host: DB_HOST || "localhost",
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD || "",
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z", // created_at/updated_at disimpan UTC
    dateStrings: true, // DATE/TIME dikembalikan sebagai string; tidak digeser timezone
  });
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool };
