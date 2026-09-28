// Harga dalam integer rupiah. Sumber harga hanya dari database (baris paket & add-on).
function calculateTotal(pkg, addons) {
  const packagePrice = Number(pkg.price);
  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.price), 0);
  if (!Number.isSafeInteger(packagePrice) || !Number.isSafeInteger(addonsTotal)) {
    throw new Error("Harga katalog tidak valid");
  }
  const subtotal = packagePrice + addonsTotal;
  return { packagePrice, addonsTotal, subtotal, total: subtotal };
}
module.exports = { calculateTotal };
