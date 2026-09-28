const contactService = require("../services/contact.service");

exports.create = async (req, res) => {
  await contactService.saveContact(req.body);
  res.status(201).json({ success: true, message: "Pesan berhasil dikirim" });
};
