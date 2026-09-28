const AppError = require("../utils/app-error");
const { getPool } = require("../config/database");
const { validateBooking } = require("../validators/booking.validator");
const { calculateTotal } = require("./pricing.service");
const { generateBookingCode } = require("../utils/booking-code");
const catalogRepo = require("../repositories/catalog.repository");
const customerRepo = require("../repositories/customer.repository");
const bookingRepo = require("../repositories/booking.repository");

const MAX_CODE_ATTEMPTS = 5;

async function createBooking(input, deps = {}) {
  const {
    pool = getPool(), catalog = catalogRepo, customers = customerRepo,
    bookings = bookingRepo, generateCode = generateBookingCode, now = new Date(),
  } = deps;

  const { value, errors } = validateBooking(input, now);
  if (errors.length) throw new AppError(400, "Data booking tidak valid", errors);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const service = await catalog.findServiceBySlug(value.service, conn);
    if (!service) throw new AppError(404, "Layanan tidak ditemukan");

    const pkg = await catalog.findPackageById(value.packageId, conn);
    if (!pkg) throw new AppError(404, "Paket tidak ditemukan");
    if (pkg.serviceId !== service.id) {
      throw new AppError(400, "Data booking tidak valid",
        [{ field: "packageId", message: "Paket tidak sesuai dengan layanan" }]);
    }

    const addons = await catalog.findAddonsForService(service.id, value.addonIds, conn);
    if (addons.length !== value.addonIds.length) {
      throw new AppError(400, "Data booking tidak valid",
        [{ field: "addonIds", message: "Ada add-on yang tidak tersedia untuk layanan ini" }]);
    }

    const pricing = calculateTotal(pkg, addons); // harga dari DB, bukan dari klien
    const customerId = await customers.upsert(conn, value.customer);

    let code = null;
    let bookingId = null;
    for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS && bookingId === null; attempt++) {
      code = generateCode();
      try {
        bookingId = await bookings.insertBooking(conn, {
          code, customerId, serviceId: service.id, packageId: pkg.id,
          packageName: pkg.name, packagePrice: pricing.packagePrice,
          eventDate: value.eventDate, eventTime: value.eventTime, location: value.location,
          notes: value.notes, subtotal: pricing.subtotal, total: pricing.total,
        });
      } catch (err) {
        const dupCode = err && err.code === "ER_DUP_ENTRY" && /uq_bookings_code|booking_code/.test(err.message || "");
        if (!dupCode || attempt === MAX_CODE_ATTEMPTS) throw err;
      }
    }

    for (const addon of addons) await bookings.insertBookingAddon(conn, bookingId, addon);

    await conn.commit();
    return {
      bookingCode: code,
      status: "pending",
      service: service.slug,
      package: pkg.name,
      addons: addons.map((a) => a.name),
      eventDate: value.eventDate,
      eventTime: value.eventTime,
      totalPrice: pricing.total,
    };
  } catch (err) {
    try { await conn.rollback(); } catch { /* koneksi mungkin sudah putus */ }
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { createBooking };
