// Butuh MySQL nyata yang sudah di-migrate & di-seed. Jalankan: RUN_DB_TESTS=1 npm test
const test = require("node:test");
const assert = require("node:assert/strict");

const enabled = process.env.RUN_DB_TESTS === "1";
const opts = { skip: enabled ? false : "RUN_DB_TESTS!=1 (butuh MySQL)" };

let server, base;
const call = async (path, init) => {
  const res = await fetch(base + path, init && { ...init, headers: { "Content-Type": "application/json" }, body: JSON.stringify(init.body) });
  return { status: res.status, body: await res.json() };
};

test.before(async () => {
  if (!enabled) return;
  process.env.NODE_ENV = "test";
  require("../../src/config/env");
  server = require("../../src/app").createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  if (!enabled) return;
  server.close();
  await require("../../src/config/database").closePool();
});

test("GET /api/health", opts, async () => {
  const r = await call("/api/health");
  assert.equal(r.status, 200); assert.equal(r.body.success, true);
});

test("services, packages, addons + filter", opts, async () => {
  assert.ok((await call("/api/services")).body.data.length > 0);
  assert.equal((await call("/api/services/graduates")).status, 200);
  assert.equal((await call("/api/services/nope")).status, 404);
  const pk = await call("/api/packages?service=graduates");
  assert.ok(pk.body.data.every((p) => p.service === "graduates"));
  assert.equal((await call("/api/packages?service=nope")).status, 404);
  assert.ok((await call("/api/addons?service=graduates")).body.data.length > 0);
});

test("booking: total dihitung server, totalPrice klien diabaikan, add-on invalid ditolak", opts, async () => {
  const pk = (await call("/api/packages?service=graduates")).body.data[1];
  const ad = (await call("/api/addons?service=graduates")).body.data[0];
  const body = { customer: { name: "Tes", phone: "08123456789" }, service: "graduates", packageId: pk.id,
    addonIds: [ad.id], eventDate: "2099-01-01", eventTime: "09:00", location: "Pamanukan", totalPrice: 1 };
  const ok = await call("/api/bookings", { method: "POST", body });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.data.totalPrice, pk.price + ad.price);
  assert.equal(ok.body.data.status, "pending");
  assert.equal((await call("/api/bookings", { method: "POST", body: { ...body, addonIds: [999999] } })).status, 400);
  assert.equal((await call("/api/bookings", { method: "POST", body: { ...body, customer: { name: "" } } })).status, 400);
});

test("contact valid & tidak ada GET publik", opts, async () => {
  const r = await call("/api/contact", { method: "POST", body: { name: "Tes", phone: "08123456789", message: "Halo, tanya paket" } });
  assert.equal(r.status, 201);
  assert.equal((await call("/api/contact")).status, 404);
  assert.equal((await call("/api/bookings")).status, 404);
});
