// Titik masuk konfigurasi environment. Semua modul yang butuh env wajib require file ini
// (idempotent). Validasi keamanan dijalankan di sini — lihat SECURITY.md § Env Validation.
const { validateEnv, isProduction } = require("./env-check");

let validated = false;
function ensureValidated() {
  if (validated) return;
  validateEnv();
  validated = true;
}

ensureValidated();

module.exports = { ensureValidated, isProduction };
