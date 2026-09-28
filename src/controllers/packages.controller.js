const AppError = require("../utils/app-error");
const catalog = require("../repositories/catalog.repository");
const { SLUG_RE } = require("../validators/common");

// Memastikan filter ?service= valid dan layanannya ada.
async function resolveServiceFilter(value) {
  if (value === undefined) return null;
  if (typeof value !== "string" || !SLUG_RE.test(value)) throw new AppError(400, "Parameter service tidak valid");
  if (!(await catalog.findServiceBySlug(value))) throw new AppError(404, "Layanan tidak ditemukan");
  return value;
}

exports.list = async (req, res) => {
  const service = await resolveServiceFilter(req.query.service);
  res.json({ success: true, data: await catalog.listPackages(service) });
};

exports.resolveServiceFilter = resolveServiceFilter;
