const bookingService = require("../services/booking.service");

exports.create = async (req, res) => {
  const data = await bookingService.createBooking(req.body);
  res.status(201).json({ success: true, message: "Booking berhasil dibuat", data });
};
