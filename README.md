# SUKA MOTO

Website portfolio, pricelist, dan booking SUKA MOTO (fotografi wisuda, pernikahan, event, dan undangan digital).
Stack: HTML/CSS/Vanilla JS · Node.js + Express · MySQL (`mysql2`, SQL langsung dengan prepared statements).

## Halaman

| Route | Keterangan |
|---|---|
| `/` | Landing page utama |
| `/graduates/` | Fotografi wisuda + kalkulator harga & form booking |
| `/wedding/` | Layanan pernikahan |
| `/event/` | Dokumentasi event |
| `/invinite/` & `/invinite/demo-dark/` | Undangan digital |
| `/404.html` | Halaman error |

Admin panel (login, dashboard, CRUD katalog) **belum tersedia** — direncanakan pada fase berikutnya.

## Requirements
- Node.js >= 20.12 (memakai `process.loadEnvFile`)
- MySQL 8.0+ (atau MariaDB 10.5+), charset `utf8mb4`

## Instalasi
```sql
CREATE DATABASE sukamoto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
```bash
cp .env.example .env      # isi DB_USER / DB_PASSWORD
npm install
npm run db:migrate
npm run db:seed
npm run dev               # development (nodemon)
npm start                 # production (NODE_ENV=production)
```

## Environment variables
| Variabel | Keterangan |
|---|---|
| `PORT`, `NODE_ENV` | port server & mode |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | koneksi MySQL |
| `CORS_ORIGINS` | daftar origin (koma) yang boleh memanggil `/api`; kosong = hanya same-origin (production) |
| `TRUST_PROXY` | jumlah reverse proxy di depan server (rate limit memakai IP asli) |

## Struktur
`server.js` (entry) · `src/app.js` · `src/{routes,controllers,services,repositories,validators,middleware,config,utils}` · `database/{migrations,seeds,migrate.js,seed.js}` · `tests/{unit,integration,qa}` · `public/` (frontend: HTML + `assets/{css,js,images}`).

Kode backend per lapisan: routes → controllers → services (logika bisnis & transaction) → repositories (SQL prepared statements). Util penting: `utils/booking-code.js` (kode booking `SM-<tahun>-<6 karakter>` tanpa O/0/I/1), `utils/phone.js` (normalisasi nomor ke `62xxx`).

## API
| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | status |
| GET | `/api/services`, `/api/services/:slug` | layanan aktif |
| GET | `/api/packages[?service=slug]` | paket aktif |
| GET | `/api/addons[?service=slug]` | add-on aktif |
| POST | `/api/bookings` | buat booking (status `pending`) |
| POST | `/api/contact` | simpan pesan kontak |

Tidak ada GET publik untuk booking/customer/kontak (menunggu autentikasi admin, Phase 4).

Body `POST /api/bookings`: `customer{name,phone,email?}`, `service` (slug), `packageId`, `addonIds[]`, `eventDate` (YYYY-MM-DD), `eventTime` (HH:MM), `location`, `notes?`.
Harga **selalu** dihitung server dari database; `totalPrice` dari klien diabaikan. Booking disimpan dalam satu transaction atomik (customer + booking + booking_addons) beserta snapshot harga (`package_price_snapshot`, `addon_price_snapshot`) sehingga perubahan katalog tidak mengubah histori. Error: `{success:false,message,errors:[{field,message}]}`.

## Keamanan & Rate Limiting
- `helmet` untuk security headers; CSP disetel sesuai resource yang dipakai.
- Prepared statements di semua query (anti SQL injection); output frontend di-escape (anti XSS).
- Rate limit per IP (`src/middleware/rate-limit.js`): API global 300/15 menit, booking 10/jam, contact 5/jam → HTTP 429 bila terlampaui.
- `.env`, `database/`, dan source server tidak pernah tersaji sebagai file statis.
- Katalog tidak pernah di-hard delete: `is_active = 0`, foreign key `ON DELETE RESTRICT`.

## Performa (Phase 7)
- Aset statis `/assets/*` dikirim dengan gzip (`zlib`, tanpa dependency baru) + `Cache-Control: public, max-age=31536000, immutable`, di-cache-bust via `?v=<hash-isi>` yang diinjeksi ke HTML saat respons (`src/middleware/static-cache.js`).
- HTML selalu `no-cache` agar perubahan halaman langsung terlihat.
- Hero/LCP memakai gambar lokal teroptimasi dengan dimensi eksplisit; gambar below-fold `loading="lazy" decoding="async"`.
- Script non-kritis memakai `defer`; polling halaman event dijeda saat tab tidak aktif; dukungan `prefers-reduced-motion`.

## Testing
```bash
npm test                      # unit test (tanpa DB); integration test di-skip
RUN_DB_TESTS=1 npm test       # + integration test (butuh MySQL termigrasi & ter-seed, DB test terpisah disarankan)
```
- `tests/unit/` — validasi & logika service booking (harga, normalisasi).
- `tests/integration/` — pengujian API end-to-end terhadap DB.
- `tests/qa/e2e-qa.test.js` — suite QA Phase 6 (booking flow, security regression, konsistensi data).

Integration test membuat booking sungguhan di database yang dikonfigurasi di `.env`. Gunakan database terpisah (mis. `sukamoto_test`) untuk pengujian destruktif.

## Troubleshooting
- `DB_USER dan DB_NAME wajib diisi` → periksa `.env`.
- 503 "Layanan sementara tidak tersedia" → MySQL tidak terjangkau / kredensial salah.
- Paket tidak muncul di `/graduates/` → jalankan `npm run db:migrate && npm run db:seed`.
- Aset lama masih tampil di browser → hard reload (Ctrl+Shift+R); versi aset berubah otomatis saat file CSS/JS diubah.

## Data & timezone
- Harga: integer rupiah (`INT UNSIGNED`).
- `event_date` (DATE) / `event_time` (TIME): waktu dinding Asia/Jakarta, disimpan apa adanya (tanpa konversi). "Hari ini" divalidasi menurut Asia/Jakarta.
- `created_at`/`updated_at`: UTC.
- Nomor telepon disimpan ternormalisasi `62xxxxxxxxxx` (UNIQUE) sebagai kunci pencarian customer.
- Katalog dinonaktifkan lewat `is_active = 0`, bukan dihapus. Foreign key `ON DELETE RESTRICT`.

## Lisensi
MIT — SUKA MOTO.
