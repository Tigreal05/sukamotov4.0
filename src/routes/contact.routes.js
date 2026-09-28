const router = require("express").Router();
const asyncHandler = require("../utils/async-handler");
const { contactLimiter } = require("../middleware/rate-limit");
const c = require("../controllers/contact.controller");

router.post("/", contactLimiter, asyncHandler(c.create));

module.exports = router;
