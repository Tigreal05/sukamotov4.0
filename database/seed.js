// Seed katalog. Idempotent & non-destruktif: baris yang sudah ada TIDAK ditimpa
// (harga yang diubah kemudian tidak kembali ke nilai seed).
require("../src/config/env");
const { getPool, closePool } = require("../src/config/database");
const data = require("./seeds/catalog");

async function main() {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    for (const s of data.services) {
      await conn.execute(
        "INSERT INTO services (slug, name, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id",
        [s.slug, s.name, s.description]);
    }
    const [srows] = await conn.execute("SELECT id, slug FROM services");
    const serviceId = Object.fromEntries(srows.map((r) => [r.slug, r.id]));

    for (const p of data.packages) {
      await conn.execute(
        `INSERT INTO packages (service_id, name, description, price, features, badge, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`,
        [serviceId[p.service], p.name, p.description, p.price, JSON.stringify(p.features || []), p.badge || null, p.terms || null]);
    }

    for (const a of data.addons) {
      await conn.execute(
        "INSERT INTO addons (name, description, price) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id = id",
        [a.name, a.description || null, a.price]);
      const [[row]] = await conn.execute("SELECT id FROM addons WHERE name = ?", [a.name]);
      for (const slug of a.services) {
        await conn.execute("INSERT IGNORE INTO service_addons (service_id, addon_id) VALUES (?, ?)", [serviceId[slug], row.id]);
      }
    }

    await conn.commit();
    console.log(`Seed selesai: ${data.services.length} layanan, ${data.packages.length} paket, ${data.addons.length} add-on.`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

main().catch((e) => { console.error("Seed gagal:", e.message); process.exitCode = 1; }).finally(closePool);
