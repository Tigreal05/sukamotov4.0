const SLUG_RE = /^[a-z0-9-]{1,60}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

const str = (v) => (typeof v === "string" ? v.trim() : "");

function isPositiveInt(v) {
  return Number.isSafeInteger(v) && v > 0;
}

function isRealDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

// Tanggal hari ini menurut zona bisnis (Asia/Jakarta), format YYYY-MM-DD.
function todayJakarta(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

module.exports = { SLUG_RE, EMAIL_RE, str, isPositiveInt, isRealDate, todayJakarta };
