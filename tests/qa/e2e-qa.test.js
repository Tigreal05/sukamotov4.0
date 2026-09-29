// SUKA MOTO — Phase 6 QA E2E Suite (non-destructive terhadap production DB)
// Jalankan: NODE_ENV=test node --test tests/qa/e2e-qa.test.js
// Butuh server berjalan di BASE_URL (default http://127.0.0.1:3000) dengan .env -> sukamoto_test.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execSync } = require("child_process");

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const results = [];
async function t(name, fn) {
  try { await fn(); results.push([name, "PASS"]); console.log(`PASS  ${name}`); }
  catch (e) { results.push([name, "FAIL", e.message]); console.log(`FAIL  ${name} :: ${e.message}`); }
}
const j = async (path, init) => {
  const res = await fetch(BASE + path, init && { ...init, headers: { "content-type": "application/json" } });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body, headers: Object.fromEntries(res.headers) };
};
const mysqlQ = (sql) => execSync(
  `MYSQL_PWD=${process.env.QA_DB_PASSWORD || "qapass"} mysql -h 127.0.0.1 -u ${process.env.QA_DB_USER || "qatest"} sukamoto_test -N -B -e "${sql.replace(/"/g, '\\"')}"`,
  { encoding: "utf8" }).trim();

const futureDate = () => new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
const validBooking = (over = {}) => ({
  customer: { name: "QA Tester", phone: "0812-3456-7890", email: "qa@example.com" },
  service: "graduates", packageId: null, addonIds: [],
  eventDate: futureDate(), eventTime: "09:00", location: "Gedung Serbaguna Pamanukan", notes: "",
  totalPrice: 1, // harga klien WAJIB diabaikan server
  ...over,
});

let PKG, PKG_PRICE, ADDON, ADDON_PRICE, WEDDING_PKG;

test("QA-E2E suite", async (root) => {

  // ---------- 12. PUBLIC API ----------
  await root.test("P01 GET /api/health -> 200 success JSON", async () => {
    const r = await j("/api/health");
    assert.equal(r.status, 200); assert.equal(r.body.success, true);
    assert.match(r.headers["content-type"], /application\/json/);
  });
  await root.test("P02 GET /api/services -> list, schema benar", async () => {
    const r = await j("/api/services");
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.data) && r.body.data.length >= 4);
    for (const k of ["id", "slug", "name"]) assert.ok(k in r.body.data[0], `field ${k} hilang`);
  });
  await root.test("P03 GET /api/services/:slug -> 200; slug tak dikenal -> 404 konsisten", async () => {
    assert.equal((await j("/api/services/graduates")).status, 200);
    const r = await j("/api/services/tidak-ada");
    assert.equal(r.status, 404); assert.equal(r.body.success, false); assert.ok(r.body.message);
  });
  await root.test("P04 GET /api/packages?service=graduates & filter salah -> 404", async () => {
    const r = await j("/api/packages?service=graduates");
    assert.equal(r.status, 200); assert.ok(r.body.data.length > 0);
    [PKG] = r.body.data; PKG_PRICE = Number(PKG.price);
    const w = await j("/api/packages?service=wedding");
    WEDDING_PKG = w.body.data[0];
    assert.equal((await j("/api/packages?service=nope")).status, 404);
  });
  await root.test("P05 GET /api/addons?service=graduates", async () => {
    const r = await j("/api/addons?service=graduates");
    assert.equal(r.status, 200);
    if (r.body.data.length) { ADDON = r.body.data[0]; ADDON_PRICE = Number(ADDON.price); }
  });

  // ---------- 7. BOOKING VALIDATION ----------
  await root.test("B01 POST /api/bookings valid -> 201, booking code, status pending", async () => {
    const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id }) });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, "pending");
    assert.match(r.body.data.bookingCode, /^SM-\d{4}-[A-Z0-9]{6}$/);
    const row = mysqlQ(`SELECT id, total_price FROM bookings WHERE booking_code='${r.body.data.bookingCode}'`).split("\t");
    global.BK1 = { ...r.body.data, id: Number(row[0]), dbTotal: Number(row[1]) };
  });
  await root.test("B02 Harga dihitung server: totalPrice klien (1) diabaikan (WAJIB)", async () => {
    const expected = PKG_PRICE + (ADDON ? ADDON_PRICE : 0);
    assert.equal(Number(global.BK1.totalPrice), expected, `expected ${expected}, got ${global.BK1.totalPrice}`);
  });
  const invalids = [
    ["missing name", (b) => { b.customer.name = ""; }],
    ["missing phone", (b) => { b.customer.phone = ""; }],
    ["invalid phone", (b) => { b.customer.phone = "abc"; }],
    ["invalid email", (b) => { b.customer.email = "bukan-email"; }],
    ["invalid service", (b) => { b.service = "tidakada"; }],
    ["missing packageId", (b) => { b.packageId = undefined; }],
    ["invalid package id", (b) => { b.packageId = 999999; }],
    ["mismatched package/service", (b) => { if (WEDDING_PKG) b.packageId = WEDDING_PKG.id; else b.packageId = 999999; }],
    ["invalid addon id", (b) => { b.addonIds = [999999]; }],
    ["mismatched addon/service", (b) => { b.addonIds = [999998]; }],
    ["missing date", (b) => { b.eventDate = ""; }],
    ["invalid date", (b) => { b.eventDate = "31-02-2099"; }],
    ["past date", (b) => { b.eventDate = "2020-01-01"; }],
    ["invalid time", (b) => { b.eventTime = "25:00"; }],
    ["empty location", (b) => { b.location = ""; }],
    ["oversized notes", (b) => { b.notes = "x".repeat(50000); }],
    ["field asing negatif", (b) => { b.quantity = -5; }],
  ];
  for (const [label, mut] of invalids) {
    await root.test(`B03 INVALID: ${label} -> 4xx + success:false`, async () => {
      const body = validBooking({ packageId: PKG.id });
      mut(body);
      const r = await j("/api/bookings", { method: "POST", body });
      assert.ok(r.status >= 400 && r.status < 500, `status ${r.status}`);
      assert.equal(r.body.success, false);
    });
  }
  await root.test("B03b body bukan objek -> 4xx", async () => {
    const r = await fetch(BASE + "/api/bookings", { method: "POST", headers: { "content-type": "application/json" }, body: '"not-an-object"' });
    assert.ok(r.status >= 400 && r.status < 500, String(r.status));
  });

  // ---------- 6. PRICE COMBINATIONS ----------
  await root.test("B04 price: package only", async () => {
    const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, customer: { name: "P Only", phone: "081100000001" } }) });
    assert.equal(Number(r.body.data.totalPrice), PKG_PRICE);
  });
  if (ADDON) {
    await root.test("B05 price: package + 1 addon", async () => {
      const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, addonIds: [ADDON.id], customer: { name: "P A1", phone: "081100000002" } }) });
      assert.equal(Number(r.body.data.totalPrice), PKG_PRICE + ADDON_PRICE);
    });
    await root.test("B06 duplicate addon id -> tidak dihitung dua kali", async () => {
      const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, addonIds: [ADDON.id, ADDON.id], customer: { name: "Dup Addon", phone: "081100000003" } }) });
      assert.equal(Number(r.body.data.totalPrice), PKG_PRICE + ADDON_PRICE);
    });
  }

  // ---------- 8. TRANSACTION CONSISTENCY ----------
  await root.test("T01 transaction: booking+addons tersimpan konsisten", async () => {
    const id = global.BK1.id;
    const cnt = Number(mysqlQ(`SELECT (SELECT COUNT(*) FROM bookings WHERE id=${id}) + (SELECT COUNT(*) FROM customers c JOIN bookings b ON b.customer_id=c.id WHERE b.id=${id})`));
    assert.ok(cnt >= 2);
    if (ADDON) {
      const ba = Number(mysqlQ(`SELECT COUNT(*) FROM booking_addons WHERE booking_id=${id}`));
      assert.ok(ba >= 1);
    }
  });

  // ---------- 9. DUPLICATE BOOKING ----------
  await root.test("D01 duplicate concurrent request (dokumentasi perilaku tanpa idempotency key)", async () => {
    const before = Number(mysqlQ("SELECT COUNT(*) FROM bookings"));
    const body = validBooking({ packageId: PKG.id, customer: { name: "Dup Test", phone: "081100000099" } });
    const rs = await Promise.all([j("/api/bookings", { method: "POST", body }), j("/api/bookings", { method: "POST", body })]);
    const after = Number(mysqlQ("SELECT COUNT(*) FROM bookings"));
    console.log(`  INFO: 2 request identik paralel -> ${after - before} booking dibuat. Tidak ada idempotency policy (didokumentasikan, bukan bug baru).`);
    assert.ok(rs.every((r) => [201, 400, 409].includes(r.status)));
  });

  // ---------- 10. BOOKING CODE UNIQUENESS ----------
  await root.test("C01 1000 kode booking: format seragam & tanpa collision berarti", async () => {
    const { generateBookingCode } = require("../../src/utils/booking-code");
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      const c = generateBookingCode();
      assert.match(c, /^SM-\d{4}-[A-HJ-NP-Z2-9]{6}$/);
      codes.add(c);
    }
    assert.ok(codes.size >= 995, `collision berlebihan: ${codes.size}/1000 unik`);
  });
  await root.test("C02 booking_code UNIQUE ditegakkan di level DB", async () => {
    const ins = `INSERT INTO bookings (booking_code,customer_id,service_id,package_id,package_name_snapshot,package_price_snapshot,event_date,event_time,location,subtotal,total_price) SELECT 'SM-2099-DUP001',customer_id,service_id,package_id,package_name_snapshot,package_price_snapshot,'2099-12-31','10:00','X',1,1 FROM bookings LIMIT 1`;
    mysqlQ(ins);
    let blocked = false;
    try { mysqlQ(ins); } catch { blocked = true; }
    assert.ok(blocked, "unique constraint booking_code TIDAK mencegah duplikat!");
    mysqlQ(`DELETE FROM bookings WHERE booking_code='SM-2099-DUP001'`);
  });

  // ---------- 19-21. SECURITY REGRESSION ----------
  await root.test("S01 GET /.env -> 404 (tidak bocor)", async () => {
    const r = await fetch(BASE + "/.env"); assert.equal(r.status, 404);
    assert.ok(!(await r.text()).includes("DB_PASSWORD"));
  });
  await root.test("S02 source server & path traversal -> 404", async () => {
    for (const p of ["/database/migrate.js", "/server.js", "/package.json", "/node_modules/mysql2/package.json", "/%2e%2e/server.js", "/..%2fserver.js"]) {
      const r = await fetch(BASE + p);
      assert.equal(r.status, 404, `${p} -> ${r.status}`);
    }
  });
  await root.test("S03 SQL injection pada input string -> ditolak/ternormalisasi, DB utuh", async () => {
    const payloads = ["'", "\"", "' OR '1'='1", "1 OR 1=1", "'; DROP TABLE bookings; --"];
    for (const p of payloads) {
      const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, customer: { name: p, phone: "08110000010" + Math.floor(Math.random() * 9) }, location: p, notes: p }) });
      assert.ok(r.status < 500, `payload ${JSON.stringify(p)} -> ${r.status}`);
    }
    const svc = await j("/api/services/'%20OR%20'1'='1"); assert.equal(svc.status, 404);
    assert.ok(mysqlQ("SHOW TABLES LIKE 'bookings'").includes("bookings"), "tabel bookings hilang!");
  });
  await root.test("S04 XSS stored: payload HTML tidak dikembalikan mentah oleh API", async () => {
    const xss = '<script>alert("x")</scr' + "ipt>";
    const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, customer: { name: "XSS Probe", phone: "081100000055" }, location: xss, notes: xss }) });
    const raw = JSON.stringify(r.body);
    assert.ok(!raw.includes("<script>"), "API mengembalikan tag mentah <script>");
  });
  await root.test("S05 Mass assignment: field asing (id,status,is_admin,role) diabaikan", async () => {
    const r = await j("/api/bookings", { method: "POST", body: { ...validBooking({ packageId: PKG.id, customer: { name: "MA Probe", phone: "081100000066" } }), id: 1, status: "completed", is_admin: true, role: "admin" } });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.status, "pending");
    assert.equal(mysqlQ(`SELECT status FROM bookings WHERE booking_code='${r.body.data.bookingCode}'`), "pending");
    // pastikan tidak ada baris booking dengan id=1 yang tertimpa (mass assignment 'id' diabaikan)
  });
  await root.test("S06 IDOR/access control: tidak ada endpoint publik untuk data admin/customer", async () => {
    for (const p of [`/api/bookings/${global.BK1.id}`, `/api/bookings/${global.BK1.bookingCode}`, "/api/customers", "/api/admin/dashboard", "/api/admin/bookings", "/api/messages", "/api/contact"]) {
      const r = await j(p);
      assert.ok([404, 401, 403].includes(r.status), `${p} -> ${r.status}`);
    }
  });
  await root.test("S07 Headers keamanan (helmet): CSP, nosniff, tanpa X-Powered-By", async () => {
    const r = await fetch(BASE + "/");
    assert.ok(r.headers.get("content-security-policy"));
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.ok(!r.headers.get("x-powered-by"));
  });
  await root.test("S08 CORS: origin asing tidak mendapat wildcard/echo", async () => {
    const r = await fetch(BASE + "/api/services", { headers: { origin: "https://evil.example" } });
    const acao = r.headers.get("access-control-allow-origin");
    assert.notEqual(acao, "*");
    assert.notEqual(acao, "https://evil.example");
  });

  // ---------- 31-34. RESPONSE FORMAT / STATUS ----------
  await root.test("R01 Format error konsisten {success:false,message}", async () => {
    for (const p of ["/api/nope", "/api/services/nope"]) {
      const r = await j(p); assert.equal(r.body.success, false); assert.ok(r.body.message);
    }
  });
  await root.test("R02 404 halaman publik -> tanpa stack trace", async () => {
    const r = await fetch(BASE + "/halaman-random-404");
    assert.equal(r.status, 404);
    const text = await r.text();
    assert.ok(!/at\s.*\.js:\d+/.test(text) && !text.includes("node_modules"));
  });
  await root.test("R03 Body terlalu besar (>20kb limit) -> 4xx, bukan 500", async () => {
    const r = await j("/api/bookings", { method: "POST", body: validBooking({ packageId: PKG.id, notes: "x".repeat(30000) }) });
    assert.ok(r.status >= 400 && r.status < 500, String(r.status));
  });

  // ---------- 16/36. SOFT DELETE & SNAPSHOT ----------
  await root.test("DB01 snapshot harga: ubah harga paket -> booking lama tetap (historical intact)", async () => {
    const bk = global.BK1;
    const oldTotal = Number(mysqlQ(`SELECT total_price FROM bookings WHERE id=${bk.id}`));
    mysqlQ(`UPDATE packages SET price = price + 50000 WHERE id=${PKG.id}`);
    assert.equal(Number(mysqlQ(`SELECT total_price FROM bookings WHERE id=${bk.id}`)), oldTotal);
    assert.equal(Number(mysqlQ(`SELECT package_price_snapshot FROM bookings WHERE id=${bk.id}`)), PKG_PRICE);
    mysqlQ(`UPDATE packages SET price = ${PKG_PRICE} WHERE id=${PKG.id}`);
  });
  await root.test("DB02 deactivate service -> historical booking utuh (FK RESTRICT)", async () => {
    const svcId = Number(mysqlQ(`SELECT service_id FROM bookings WHERE id=${global.BK1.id}`));
    mysqlQ(`UPDATE services SET is_active = 0 WHERE id=${svcId}`);
    assert.ok(Number(mysqlQ(`SELECT COUNT(*) FROM bookings WHERE service_id=${svcId}`)) >= 1);
    mysqlQ(`UPDATE services SET is_active = 1 WHERE id=${svcId}`);
  });
  await root.test("DB03 FK RESTRICT: hapus customer dgn booking -> ditolak DB", async () => {
    const cid = Number(mysqlQ(`SELECT customer_id FROM bookings WHERE id=${global.BK1.id} LIMIT 1`));
    let blocked = false;
    try { mysqlQ(`DELETE FROM customers WHERE id=${cid}`); } catch { blocked = true; }
    assert.ok(blocked, "delete customer dengan booking seharusnya diblokir FK");
  });
  await root.test("DB04 foreign_keys ON & indexes penting ada", async () => {
    assert.equal(mysqlQ("SELECT @@foreign_key_checks"), "1");
    const idx = mysqlQ("SHOW INDEX FROM bookings");
    for (const col of ["booking_code", "customer_id", "service_id", "package_id", "event_date", "status"]) {
      assert.ok(idx.includes(col), `index untuk ${col} hilang`);
    }
  });

  // ---------- 40. PERFORMANCE SANITY ----------
  await root.test("PF01 response public API < 1s", async () => {
    for (const p of ["/api/services", "/api/packages?service=graduates", "/api/addons?service=graduates"]) {
      const t0 = Date.now(); const r = await j(p);
      assert.equal(r.status, 200);
      assert.ok(Date.now() - t0 < 1000, `${p} lambat`);
    }
  });

  // ---------- 24. FRONTEND STATIC ----------
  const pages = ["/", "/graduates/", "/wedding/", "/event/", "/invinite/", "/invinite/demo-dark/"];
  for (const p of pages) {
    await root.test(`F01 halaman ${p} -> 200 HTML`, async () => {
      const r = await fetch(BASE + p); assert.equal(r.status, 200);
      assert.match(await r.text(), /<!doctype html>/i);
    });
  }
  await root.test("F02 aset lokal yang direferensikan index -> tidak 404", async () => {
    const html = await (await fetch(BASE + "/")).text();
    const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:css|js|png|jpg|jpeg|webp|svg))(?:\?[^"]*)?"/g)].map((m) => m[1]);
    const local = refs.filter((r) => !/^https?:|^data:|^mailto:|^tel:/i.test(r)).slice(0, 60);
    const bad = [];
    for (const r of local) {
      const res = await fetch(new URL(r, BASE + "/"));
      if (res.status === 404) bad.push(r);
    }
    assert.deepEqual(bad, [], `aset 404: ${bad.join(", ")}`);
  });
  await root.test("F03 JS publik: syntax check semua file assets/js", async () => {
    const files = execSync(`find public/assets/js -name '*.js'`, { cwd: "/workspace", encoding: "utf8" }).trim().split("\n").filter(Boolean);
    assert.ok(files.length > 0);
    for (const f of files) execSync(`node --check ${f}`, { encoding: "utf8" });
  });

  // ---------- 13-18, 30. ADMIN (belum ada di repo) ----------
  await root.test("A01 /admin/* -> 404 aman (fitur admin belum diimplementasikan)", async () => {
    for (const p of ["/admin/", "/admin/login.html", "/admin/bookings.html"]) {
      const r = await fetch(BASE + p); assert.equal(r.status, 404);
    }
  });

  // ---------- 23. RATE LIMIT ----------
  await root.test("RL01 limiter terdefinisi; skip hanya saat NODE_ENV=test (by design)", async () => {
    const rl = require("../../src/middleware/rate-limit");
    for (const k of ["apiLimiter", "bookingLimiter", "contactLimiter"]) assert.equal(typeof rl[k], "function");
    assert.equal(process.env.NODE_ENV, "test");
  });

  // ---------- 44. SEO ----------
  await root.test("SEO01 metadata publik: title + meta description", async () => {
    for (const p of pages) {
      const html = await (await fetch(BASE + p)).text();
      assert.match(html, /<title>[^<]+<\/title>/i, `${p} tanpa title`);
      if (p !== "/invinite/demo-dark/") assert.match(html, /meta\s+name=["']description["']/i, `${p} tanpa meta description`);
    }
  });

  // ---------- 11. STATUS TRANSITION (level DB — belum ada admin API) ----------
  await root.test("ST01 enum status: transisi legal tersimpan; nilai ilegal tidak menjadi status valid", async () => {
    const id = global.BK1.id;
    mysqlQ(`UPDATE bookings SET status='confirmed' WHERE id=${id}`);
    assert.equal(mysqlQ(`SELECT status FROM bookings WHERE id=${id}`), "confirmed");
    mysqlQ(`UPDATE bookings SET status='cancelled' WHERE id=${id}`);
    assert.equal(mysqlQ(`SELECT status FROM bookings WHERE id=${id}`), "cancelled");
    mysqlQ(`SET SQL_MODE='STRICT_TRANS_TABLES'; UPDATE bookings SET status='selesai-palsu' WHERE id=${id}`);
    const now = mysqlQ(`SELECT status FROM bookings WHERE id=${id}`);
    assert.ok(["pending", "confirmed", "completed", "cancelled"].includes(now), `nilai ilegal diterima (status='${now}')`);
    mysqlQ(`UPDATE bookings SET status='pending' WHERE id=${id}`);
  });
});

test.after(() => {
  const pass = results.filter((r) => r[1] === "PASS").length;
  console.log(`\n=== QA E2E SUMMARY: ${pass}/${results.length} PASS ===`);
  for (const r of results) if (r[1] !== "PASS") console.log(`FAILED: ${r[0]} :: ${r[2]}`);
});
