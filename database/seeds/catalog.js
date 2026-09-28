// Data katalog aktual yang diambil dari frontend & backend proyek (Phase 1-2).
// Layanan tanpa paket = harga belum ada di proyek (jangan mengarang harga).
const WISUDA_ADDONS = [
  ["Tambah Durasi 60 Menit", 100000],
  ["Cetak Foto 10R + Bingkai Eksklusif", 75000],
  ["Tambah Lokasi Sesi Kedua", 100000],
  ["Extra Grading 50 Foto", 100000],
];

const GRAD_COMMON = ["1 lokasi", "Semua file mentah"];

module.exports = {
  services: [
    { slug: "graduates", name: "Graduates", description: "Paket foto wisuda dengan hasil premium dan edit rapi." },
    { slug: "wedding", name: "Wedding", description: "Paket foto pernikahan untuk momen paling berharga." },
    { slug: "event", name: "Event", description: "Paket dokumentasi acara untuk kebutuhan perusahaan atau keluarga." },
    { slug: "prewedding", name: "Prewedding", description: "Paket prewedding custom sesuai keinginan pasangan." },
    { slug: "engagement", name: "Engagement", description: "Paket engagement dengan konsep yang personal." },
    { slug: "birthday", name: "Birthday", description: "Paket foto ulang tahun untuk momen keluarga dan teman." },
    { slug: "pas-foto", name: "Pas Foto", description: "Layanan pas foto untuk kebutuhan formal dan personal." },
    { slug: "invinite", name: "Digital Invitation", description: "Undangan web interaktif dan elegan." },
  ],
  packages: [
    { service: "graduates", name: "Promo Wisuda", price: 300000, description: "Paket hemat untuk pengerjaan cepat.",
      features: ["Durasi 35 menit", ...GRAD_COMMON, "Tanpa edit"], badge: "PROMO SPECIAL",
      terms: "*Syarat & Ketentuan: Khusus pemotretan di lokasi Gedung Negara, Cirebon." },
    { service: "graduates", name: "Basic", price: 350000, description: "Untuk momen ini yang sederhana.",
      features: ["Durasi 1 jam", ...GRAD_COMMON, "Tanpa edit"] },
    { service: "graduates", name: "Gold", price: 400000, description: "Pilihan seimbang untuk cerita lengkap.",
      features: ["Durasi 1 jam", ...GRAD_COMMON, "25 foto edit pilihan"] },
    { service: "graduates", name: "Premium", price: 500000, description: "Lebih banyak frame untuk dikenang.",
      features: ["Durasi 1 jam", ...GRAD_COMMON, "40 foto edit pilihan"] },
    { service: "invinite", name: "Paket Basic", price: 75000, description: "Undangan web dasar.",
      features: ["Masa Aktif 1 Bulan", "Nama Tamu Tanpa Batas", "Musik Latar Bebas Pilih", "Integrasi Google Maps", "RSVP via WhatsApp"] },
    { service: "invinite", name: "Paket Premium", price: 149000, description: "Semua fitur Basic plus galeri dan amplop digital.",
      features: ["Semua Fitur Paket Basic", "Masa Aktif 6 Bulan", "Galeri Foto (Up to 10 Foto)", "Fitur Amplop Digital (Copy Rekening)", "Countdown Timer Acara"],
      badge: "PALING POPULER" },
  ],
  addons: WISUDA_ADDONS.map(([name, price]) => ({ name, price, services: ["graduates"] })),
};
