// Customer di-lookup lewat nomor telepon ternormalisasi (UNIQUE), tetapi PK internal tetap `id`.
async function upsert(conn, { name, phone, email }) {
  const [res] = await conn.execute(
    `INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), email = COALESCE(VALUES(email), email), id = LAST_INSERT_ID(id)`,
    [name, phone, email || null]);
  return Number(res.insertId);
}
module.exports = { upsert };
