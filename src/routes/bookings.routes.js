const router = require("express").Router();
const asyncHandler = require("../utils/async-handler");
const { bookingLimiter } = require("../middleware/rate-limit");
const c = require("../controllers/bookings.controller");

// Hanya POST. Tidak ada GET publik (data customer) sampai ada autentikasi admin (Phase 4).
router.post("/", bookingLimiter, asyncHandler(c.create));

module.exports = router;
