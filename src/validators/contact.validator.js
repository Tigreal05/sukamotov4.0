const { normalizePhone } = require("../utils/phone");
const { EMAIL_RE, str } = require("./common");

function validateContact(body) {
  const errors = [];
  const add = (field, message) => errors.push({ field, message });
  const b = body && typeof body === "object" && !Array.isArray(body) ? body : {};

  const name = str(b.name);
  if (name.length < 2 || name.length > 100) add("name", "Nama wajib diisi (2-100 karakter)");

  let phone = null;
  if (str(b.phone) !== "") {
    phone = normalizePhone(b.phone);
    if (!phone) add("phone", "Nomor WhatsApp tidak valid");
  }

  let email = null;
  if (str(b.email) !== "") {
    email = str(b.email).toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) add("email", "Email tidak valid");
  }

  if (!phone && !email && !errors.some((e) => e.field === "phone" || e.field === "email")) {
    add("phone", "Isi nomor WhatsApp atau email agar kami bisa membalas");
  }

  const message = str(b.message);
  if (message.length < 5 || message.length > 2000) add("message", "Pesan wajib diisi (5-2000 karakter)");

  return { errors, value: { name, phone, email, message } };
}

module.exports = { validateContact };
