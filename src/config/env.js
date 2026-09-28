// Memuat .env (jika ada). Nilai dari environment sistem tetap diprioritaskan.
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}
