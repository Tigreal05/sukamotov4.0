const test = require("node:test");
const assert = require("node:assert/strict");
const { createBooking } = require("../../src/services/booking.service");
const { calculateTotal } = require("../../src/services/pricing.service");
const AppError = require("../../src/utils/app-error");

const NOW = new Date("2026-10-01T03:00:00Z");
const input = (o = {}) => ({
  customer: { name: "Budi", phone: "08123456789" }, service: "graduates", packageId: 1, addonIds: [10, 11],
  eventDate: "2026-12-20", eventTime: "09:00", location: "Pamanukan", ...o,
});

function fakes({ failOn } = {}) {
  const log = [];
  const conn = {
    beginTransaction: async () => log.push("begin"),
    commit: async () => log.push("commit"),
    rollback: async () => log.push("rollback"),
    release: () => log.push("release"),
  };
  const catalog = {
    findServiceBySlug: async (slug) => (slug === "graduates" ? { id: 1, slug } : slug === "event" ? { id: 2, slug } : null),
    findPackageById: async (id) => (id === 1 ? { id: 1, serviceId: 1, name: "Gold", price: 750000 } : id === 9 ? { id: 9, serviceId: 2, name: "X", price: 1 } : null),
    findAddonsForService: async (sid, ids) => [{ id: 10, name: "A", price: 100000 }, { id: 11, name: "B", price: 75000 }].filter((a) => ids.includes(a.id)),
  };
  const customers = { upsert: async () => { log.push("customer"); return 5; } };
  const inserted = [];
  const bookings = {
    insertBooking: async (c, b) => { log.push("booking"); inserted.push(b); if (failOn === "booking") throw new Error("db"); return 77; },
    insertBookingAddon: async (c, id, a) => { log.push("addon:" + a.id); if (failOn === "addon") throw new Error("db"); },
  };
  return { log, inserted, deps: { pool: { getConnection: async () => conn }, catalog, customers, bookings, now: NOW } };
}

test("pricing: subtotal = paket + add-on (integer)", () => {
  assert.deepEqual(calculateTotal({ price: 750000 }, [{ price: 100000 }, { price: 75000 }]),
    { packagePrice: 750000, addonsTotal: 175000, subtotal: 925000, total: 925000 });
  assert.throws(() => calculateTotal({ price: "abc" }, []));
});

test("booking valid: commit, pending, total dari server, totalPrice klien diabaikan", async () => {
  const { log, inserted, deps } = fakes();
  const out = await createBooking(input({ totalPrice: 1000 }), deps);
  assert.equal(out.totalPrice, 925000);
  assert.equal(out.status, "pending");
  assert.match(out.bookingCode, /^SM-\d{4}-[A-Z2-9]{6}$/);
  assert.equal(inserted[0].total, 925000);
  assert.deepEqual(log, ["begin", "customer", "booking", "addon:10", "addon:11", "commit", "release"]);
});

test("rollback jika insert add-on gagal (tidak ada commit)", async () => {
  const { log, deps } = fakes({ failOn: "addon" });
  await assert.rejects(createBooking(input(), deps), /db/);
  assert.ok(log.includes("rollback")); assert.ok(!log.includes("commit")); assert.ok(log.includes("release"));
});

test("rollback jika insert booking gagal", async () => {
  const { log, deps } = fakes({ failOn: "booking" });
  await assert.rejects(createBooking(input(), deps), /db/);
  assert.ok(log.includes("rollback")); assert.ok(!log.includes("commit"));
});

test("penolakan: layanan 404, paket 404, mismatch 400, add-on invalid 400, validasi 400", async () => {
  const st = async (o) => { const { deps } = fakes(); try { await createBooking(input(o), deps); } catch (e) { assert.ok(e instanceof AppError); return [e.status, e.errors && e.errors[0].field]; } };
  assert.deepEqual(await st({ service: "nope" }), [404, undefined]);
  assert.deepEqual(await st({ packageId: 404 }), [404, undefined]);
  assert.deepEqual(await st({ packageId: 9 }), [400, "packageId"]);
  assert.deepEqual(await st({ addonIds: [10, 999] }), [400, "addonIds"]);
  assert.deepEqual(await st({ customer: { name: "", phone: "1" } }), [400, "customer.name"]);
});

test("kode booking duplikat: retry dengan kode baru", async () => {
  const { deps } = fakes();
  let n = 0;
  const codes = ["SM-2026-AAAAAA", "SM-2026-BBBBBB"];
  deps.generateCode = () => codes[n++];
  const orig = deps.bookings.insertBooking;
  deps.bookings.insertBooking = async (c, b) => {
    if (b.code === codes[0]) { const e = new Error("Duplicate entry for key 'uq_bookings_code'"); e.code = "ER_DUP_ENTRY"; throw e; }
    return orig(c, b);
  };
  const out = await createBooking(input(), deps);
  assert.equal(out.bookingCode, "SM-2026-BBBBBB");
});
