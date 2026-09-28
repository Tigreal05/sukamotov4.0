// Menjalankan file database/migrations/*.sql berurutan; yang sudah berjalan dilewati.
// Tidak pernah DROP / reset data.
require("../src/config/env");
const fs = require("fs");
const path = require("path");
const { getPool, closePool } = require("../src/config/database");

async function main() {
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(190) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const [rows] = await pool.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    await pool.query(fs.readFileSync(path.join(dir, file), "utf8")); // satu statement per file
    await pool.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
    console.log(`applied  ${file}`);
    count++;
  }
  console.log(count ? `Selesai: ${count} migration dijalankan.` : "Database sudah up to date.");
}

main().catch((e) => { console.error("Migration gagal:", e.message); process.exitCode = 1; })
  .finally(closePool);
