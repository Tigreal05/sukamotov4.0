// Access log ringkas: method, path (tanpa query string — hindari kebocoran data di URL), status, durasi, IP.
// Tidak mencatat body, header, cookie, maupun token.
const logger = require("../config/logger");

module.exports = function requestLog(req, res, next) {
  const started = Date.now();
  res.on("finish", () => {
    logger.info("http_request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip,
    });
  });
  next();
};
