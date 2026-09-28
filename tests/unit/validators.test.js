const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizePhone } = require("../../src/utils/phone");
const { validateBooking } = require("../../src/validators/booking.validator");
const { validateContact } = require("../../src/validators/contact.validator");
const { generateBookingCode } = require("../../src/utils/booking-code");

const NOW = new Date("2026-10-01T03:00:00Z"); // 10:00 WIB
const valid = () => ({
  customer: { name: "Budi", phone: "0812-3456-7890", email: "Budi@Example.com" },
  service: "graduates", packageId: 1, addonIds: [2, 3, 2],
  eventDate: "2026-12-20", eventTime: "09:00", location: "Pamanukan", notes: "catatan",
});

test("normalizePhone", () => {
  assert.equal(normalizePhone("08123456789"), "628123456789");
  assert.equal(normalizePhone("+62 812-3456-789"), "62812345678" + "9");
  assert.equal(normalizePhone("812345678"), "62812345678");
  assert.equal(normalizePhone("abc"), null);
  assert.equal(normalizePhone("0812"), null);
  assert.equal(normalizePhone(123), null);
});

test("booking valid: normalisasi & dedupe addon", () => {
  const { value, errors } = validateBooking(valid(), NOW);
  assert.deepEqual(errors, []);
  assert.equal(value.customer.phone, "6281234567890");
  assert.equal(value.customer.email, "budi@example.com");
  assert.deepEqual(value.addonIds, [2, 3]);
});

test("booking: totalPrice dari klien tidak ikut ke value", () => {
  const { value } = validateBooking({ ...valid(), totalPrice: 1, subtotal: 1 }, NOW);
  assert.equal("totalPrice" in value, false);
  assert.equal("subtotal" in value, false);
});

test("booking: field wajib & format", () => {
  const { errors } = validateBooking({ customer: { name: "", phone: "x" }, service: "A B", packageId: "1",
    addonIds: "2", eventDate: "2026-02-30", eventTime: "25:00", location: "" }, NOW);
  const fields = errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ["addonIds", "customer.name", "customer.phone", "eventDate", "eventTime", "location", "packageId", "service"].sort());
});

test("booking: tanggal lampau ditolak, hari ini (WIB) diterima", () => {
  assert.equal(validateBooking({ ...valid(), eventDate: "2026-09-30" }, NOW).errors[0].field, "eventDate");
  assert.deepEqual(validateBooking({ ...valid(), eventDate: "2026-10-01" }, NOW).errors, []);
  // 20:00 UTC 30 Sep = 03:00 WIB 1 Okt -> 30 Sep sudah lewat menurut WIB
  const late = new Date("2026-09-30T20:00:00Z");
  assert.equal(validateBooking({ ...valid(), eventDate: "2026-09-30" }, late).errors[0].field, "eventDate");
});

test("booking: body bukan objek", () => {
  assert.ok(validateBooking(null, NOW).errors.length > 0);
  assert.ok(validateBooking([], NOW).errors.length > 0);
});

test("contact validator", () => {
  assert.deepEqual(validateContact({ name: "Ani", phone: "08123456789", message: "Halo, tanya paket" }).errors, []);
  assert.ok(validateContact({ name: "Ani", message: "Halo, tanya paket" }).errors.some((e) => e.field === "phone"));
  assert.ok(validateContact({ name: "A", email: "x", message: "h" }).errors.length >= 3);
});

test("booking code: format & tidak ambigu", () => {
  const codes = new Set();
  for (let i = 0; i < 500; i++) {
    const c = generateBookingCode();
    assert.match(c, /^SM-\d{4}-[A-HJ-NP-Z2-9]{6}$/);
    codes.add(c);
  }
  assert.ok(codes.size > 495);
});
