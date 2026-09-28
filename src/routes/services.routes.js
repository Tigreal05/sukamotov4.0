const router = require("express").Router();
const asyncHandler = require("../utils/async-handler");
const c = require("../controllers/services.controller");

router.get("/", asyncHandler(c.list));
router.get("/:slug", asyncHandler(c.getBySlug));

module.exports = router;
