// Logger terstruktur (JSON baris-per-event) — lihat SECURITY.md § Logging.
// Aturan: JANGAN pernah mencatat password, session secret, DB password, CSRF/authorization token,
// atau data customer lengkap. Yang dicatat hanya event keamanan + metadata non-sensitif.
const LEVELS = ["debug", "info", "warn", "error"];
const CURRENT = () => (process.env.LOG_LEVEL && LEVELS.includes(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : "info");

function log(level, event, meta) {
  if (LEVELS.indexOf(level) < LEVELS.indexOf(CURRENT())) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...(meta || {}) });
  if (level === "error") console.error(line);
  else console.log(line);
}

module.exports = {
  debug: (e, m) => log("debug", e, m),
  info: (e, m) => log("info", e, m),
  warn: (e, m) => log("warn", e, m),
  error: (e, m) => log("error", e, m),
};
