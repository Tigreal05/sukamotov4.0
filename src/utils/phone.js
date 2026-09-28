// Normalisasi nomor Indonesia ke format 62xxxxxxxxxx. Mengembalikan null jika tidak valid.
function normalizePhone(raw) {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(d)) return null;
  d = d.replace(/^\+/, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^62\d{8,13}$/.test(d) ? d : null;
}
module.exports = { normalizePhone };
