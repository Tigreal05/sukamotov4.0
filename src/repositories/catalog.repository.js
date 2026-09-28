const { getPool } = require("../config/database");

function parseFeatures(v) {
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v || "[]");
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

const mapService = (r) => ({ id: Number(r.id), slug: r.slug, name: r.name, description: r.description });
const mapPackage = (r) => ({
  id: Number(r.id),
  serviceId: Number(r.service_id),
  service: r.service_slug,
  name: r.name,
  description: r.description,
  price: Number(r.price),
  features: parseFeatures(r.features),
  badge: r.badge,
  terms: r.terms,
});
const mapAddon = (r) => ({ id: Number(r.id), name: r.name, description: r.description, price: Number(r.price) });

const PACKAGE_SELECT = `SELECT p.id, p.service_id, s.slug AS service_slug, p.name, p.description, p.price, p.features, p.badge, p.terms
  FROM packages p JOIN services s ON s.id = p.service_id`;

async function listServices(exec = getPool()) {
  const [rows] = await exec.execute(
    "SELECT id, slug, name, description FROM services WHERE is_active = 1 ORDER BY id");
  return rows.map(mapService);
}

async function findServiceBySlug(slug, exec = getPool()) {
  const [rows] = await exec.execute(
    "SELECT id, slug, name, description FROM services WHERE slug = ? AND is_active = 1", [slug]);
  return rows[0] ? mapService(rows[0]) : null;
}

async function listPackages(serviceSlug = null, exec = getPool()) {
  const where = "WHERE p.is_active = 1 AND s.is_active = 1" + (serviceSlug ? " AND s.slug = ?" : "");
  const [rows] = await exec.execute(`${PACKAGE_SELECT} ${where} ORDER BY p.service_id, p.price, p.id`,
    serviceSlug ? [serviceSlug] : []);
  return rows.map(mapPackage);
}

async function findPackageById(id, exec = getPool()) {
  const [rows] = await exec.execute(
    `${PACKAGE_SELECT} WHERE p.id = ? AND p.is_active = 1 AND s.is_active = 1`, [id]);
  return rows[0] ? mapPackage(rows[0]) : null;
}

async function listAddons(serviceSlug = null, exec = getPool()) {
  const [rows] = serviceSlug
    ? await exec.execute(
        `SELECT a.id, a.name, a.description, a.price FROM addons a
         JOIN service_addons sa ON sa.addon_id = a.id JOIN services s ON s.id = sa.service_id
         WHERE a.is_active = 1 AND s.slug = ? ORDER BY a.id`, [serviceSlug])
    : await exec.execute("SELECT id, name, description, price FROM addons WHERE is_active = 1 ORDER BY id");
  return rows.map(mapAddon);
}

// Hanya add-on aktif yang berlaku untuk layanan tsb. Placeholder dibangun dari jumlah id (nilai tetap di-bind).
async function findAddonsForService(serviceId, ids, exec = getPool()) {
  if (!ids.length) return [];
  const marks = ids.map(() => "?").join(",");
  const [rows] = await exec.execute(
    `SELECT a.id, a.name, a.description, a.price FROM addons a
     JOIN service_addons sa ON sa.addon_id = a.id
     WHERE sa.service_id = ? AND a.is_active = 1 AND a.id IN (${marks}) ORDER BY a.id`,
    [serviceId, ...ids]);
  return rows.map(mapAddon);
}

module.exports = { listServices, findServiceBySlug, listPackages, findPackageById, listAddons, findAddonsForService };
