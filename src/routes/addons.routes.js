const router = require("express").Router();
const asyncHandler = require("../utils/async-handler");
const c = require("../controllers/addons.controller");

router.get("/", asyncHandler(c.list));

module.exports = router;
