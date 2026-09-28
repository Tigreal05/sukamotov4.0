const catalog = require("../repositories/catalog.repository");
const { resolveServiceFilter } = require("./packages.controller");

exports.list = async (req, res) => {
  const service = await resolveServiceFilter(req.query.service);
  res.json({ success: true, data: await catalog.listAddons(service) });
};
