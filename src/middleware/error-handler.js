const CONNECTION_ERRORS = new Set([
  "ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ENOTFOUND",
]);

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err && err.expose && err.status) {
    const body = { success: false, message: err.message };
    if (err.errors) body.errors = err.errors;
    return res.status(err.status).json(body);
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Data terlalu besar" });
  }
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({ success: false, message: "Format JSON tidak valid" });
  }

  // Error tak terduga: log di server, jangan bocorkan detail ke klien.
  console.error(process.env.NODE_ENV === "production" ? `${err && err.code} ${err && err.message}` : err);

  if (err && CONNECTION_ERRORS.has(err.code)) {
    return res.status(503).json({ success: false, message: "Layanan sementara tidak tersedia. Silakan coba lagi." });
  }
  return res.status(500).json({ success: false, message: "Terjadi kesalahan pada server" });
};
