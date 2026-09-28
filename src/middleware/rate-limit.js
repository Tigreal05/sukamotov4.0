const rateLimit = require("express-rate-limit");

function limiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { success: false, message },
  });
}

const MIN = 60 * 1000;

module.exports = {
  apiLimiter: limiter(15 * MIN, 300, "Terlalu banyak permintaan. Coba lagi nanti."),
  bookingLimiter: limiter(60 * MIN, 10, "Terlalu banyak booking dari perangkat ini. Coba lagi nanti atau hubungi kami via WhatsApp."),
  contactLimiter: limiter(60 * MIN, 5, "Terlalu banyak pesan. Coba lagi nanti."),
};
