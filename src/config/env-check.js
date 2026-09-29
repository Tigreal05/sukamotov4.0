// Validasi environment saat startup — lihat SECURITY.md § Secrets & Env Validation.
// Prinsip: JANGAN diam-diam memakai nilai default yang tidak aman di production.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const INSECURE_SECRETS = new Set(["secret", "changeme", "password", "session_secret", "sukamoto", "123456"]);
const MIN_SECRET_LENGTH = 32;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

// Memuat .env manual (tanpa dependensi dotenv) bila tersedia.
// Nilai dari environment sistem tetap diprioritaskan.
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^".*"$/s.test(value) || /^'.*'$/s.test(value)) value = value.slice(1, -1);
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function validateEnv() {
  loadEnvFile();
  const errors = [];
  const prod = isProduction();

  const secret = process.env.SESSION_SECRET || "";
  if (prod) {
    if (secret.length < MIN_SECRET_LENGTH) {
      errors.push(`SESSION_SECRET wajib diisi (minimal ${MIN_SECRET_LENGTH} karakter) di production`);
    } else if (INSECURE_SECRETS.has(secret.toLowerCase())) {
      errors.push("SESSION_SECRET tidak boleh memakai nilai umum/insecure");
    }
    if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      errors.push("DB_USER, DB_PASSWORD, dan DB_NAME wajib diisi di production");
    }
    if ((process.env.DB_USER || "").toLowerCase() === "root") {
      errors.push("Jangan gunakan user MySQL 'root' untuk aplikasi di production (buat user khusus, mis. sukamoto_app)");
    }
  } else if (!secret) {
    // Development/test saja: generate sementara agar sesi tetap berfungsi & tidak pakai secret lemah.
    process.env.SESSION_SECRET = crypto.randomBytes(48).toString("hex");
    console.warn("[config] SESSION_SECRET belum diisi — dibuat sementara acak untuk development (sesi hilang saat restart). Untuk dev persisten, isi .env Anda.");
  }

  if (errors.length) {
    console.error("[config] Konfigurasi environment tidak aman / tidak lengkap:\n- " + errors.join("\n- "));
    console.error("Server dihentikan. Lihat .env.example dan SECURITY.md.");
    process.exit(1);
  }
}

module.exports = { validateEnv, isProduction, MIN_SECRET_LENGTH };
