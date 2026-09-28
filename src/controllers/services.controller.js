const AppError = require("../utils/app-error");
const catalog = require("../repositories/catalog.repository");
const { SLUG_RE } = require("../validators/common");

exports.list = async (req, res) => {
  res.json({ success: true, data: await catalog.listServices() });
};

exports.getBySlug = async (req, res) => {
  const service = SLUG_RE.test(req.params.slug) ? await catalog.findServiceBySlug(req.params.slug) : null;
  if (!service) throw new AppError(404, "Layanan tidak ditemukan");
  res.json({ success: true, data: service });
};
