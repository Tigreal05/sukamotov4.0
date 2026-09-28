const { normalizePhone } = require("../utils/phone");
const { SLUG_RE, EMAIL_RE, str, isPositiveInt, isRealDate, todayJakarta } = require("./common");

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_ADDONS = 20;

// Hanya field yang dikenal yang diambil. totalPrice/subtotal dari klien DIABAIKAN.
function validateBooking(body, now = new Date()) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const c = b.customer && typeof b.customer === "object" && !Array.isArray(b.customer) ? b.customer : {};

  const name = str(c.name);
  if (name.length < 2 || name.length > 100) add("customer.name", "Nama wajib diisi (2-100 karakter)");

  const phone = normalizePhone(c.phone);
  if (!phone) add("customer.phone", "Nomor WhatsApp tidak valid (contoh: 08123456789)");

  let email = null;
  if (c.email !== undefined && c.email !== null && str(c.email) !== "") {
    email = str(c.email).toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) add("customer.email", "Email tidak valid");
  }

  const service = str(b.service);
  if (!SLUG_RE.test(service)) add("service", "Layanan wajib diisi");

  if (!isPositiveInt(b.packageId)) add("packageId", "Paket wajib dipilih");

  let addonIds = [];
  if (b.addonIds !== undefined && b.addonIds !== null) {
    if (!Array.isArray(b.addonIds) || b.addonIds.length > MAX_ADDONS || !b.addonIds.every(isPositiveInt)) {
      add("addonIds", "Add-on tidak valid");
    } else {
      addonIds = [...new Set(b.addonIds)];
    }
  }

  const eventDate = str(b.eventDate);
  if (!isRealDate(eventDate)) add("eventDate", "Tanggal tidak valid");
  else if (eventDate < todayJakarta(now)) add("eventDate", "Tanggal tidak boleh sebelum hari ini");

  const eventTime = str(b.eventTime);
  if (!TIME_RE.test(eventTime)) add("eventTime", "Jam tidak valid (format HH:MM)");

  const location = str(b.location);
  if (location.length < 3 || location.length > 200) add("location", "Lokasi wajib diisi (3-200 karakter)");

  const notes = str(b.notes);
  if (notes.length > 1000) add("notes", "Catatan maksimal 1000 karakter");

  return {
    errors,
    value: {
      customer: { name, phone, email },
      service,
      packageId: b.packageId,
      addonIds,
      eventDate,
      eventTime,
      location,
      notes: notes || null,
    },
  };
}

module.exports = { validateBooking };
