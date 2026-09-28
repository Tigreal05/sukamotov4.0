async function insertBooking(conn, b) {
  const [res] = await conn.execute(
    `INSERT INTO bookings (booking_code, customer_id, service_id, package_id, package_name_snapshot,
       package_price_snapshot, event_date, event_time, location, notes, subtotal, total_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [b.code, b.customerId, b.serviceId, b.packageId, b.packageName, b.packagePrice,
      b.eventDate, b.eventTime, b.location, b.notes, b.subtotal, b.total]);
  return Number(res.insertId);
}

async function insertBookingAddon(conn, bookingId, addon) {
  await conn.execute(
    `INSERT INTO booking_addons (booking_id, addon_id, addon_name_snapshot, addon_price_snapshot) VALUES (?, ?, ?, ?)`,
    [bookingId, addon.id, addon.name, addon.price]);
}

module.exports = { insertBooking, insertBookingAddon };
