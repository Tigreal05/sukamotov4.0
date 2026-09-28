const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa O/0/I/1

function jakartaYear() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date());
}

// Contoh: SM-2026-A7K92P
function generateBookingCode() {
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `SM-${jakartaYear()}-${suffix}`;
}

module.exports = { generateBookingCode };
