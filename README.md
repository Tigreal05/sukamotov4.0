# SUKA MOTO

Website portfolio, pricelist, dan booking SUKA MOTO.
Stack: HTML/CSS/Vanilla JS · Node.js + Express · MySQL (`mysql2`, SQL langsung dengan prepared statements).

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
`server.js` (entry) · `src/app.js` · `src/{routes,controllers,services,repositories,validators,middleware,config,utils}` · `database/{migrations,seeds,migrate.js,seed.js}` · `tests/` · `public/` (frontend).

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
Harga **selalu** dihitung server dari database; `totalPrice` dari klien diabaikan. Error: `{success:false,message,errors:[{field,message}]}`.

## Data & timezone
- Harga: integer rupiah (`INT UNSIGNED`).
- `event_date` (DATE) / `event_time` (TIME): waktu dinding Asia/Jakarta, disimpan apa adanya (tanpa konversi). "Hari ini" divalidasi menurut Asia/Jakarta.
- `created_at`/`updated_at`: UTC.
- Nomor telepon disimpan ternormalisasi `62xxxxxxxxxx` (UNIQUE) sebagai kunci pencarian customer.
- Katalog dinonaktifkan lewat `is_active = 0`, bukan dihapus. Foreign key `ON DELETE RESTRICT`.

## Testing
```bash
npm test                      # unit test (tanpa DB); integration test di-skip
RUN_DB_TESTS=1 npm test       # + integration test (butuh MySQL termigrasi & ter-seed, DB test terpisah disarankan)
```
Integration test membuat booking sungguhan di database yang dikonfigurasi di `.env`.

## Troubleshooting
- `DB_USER dan DB_NAME wajib diisi` → periksa `.env`.
- 503 "Layanan sementara tidak tersedia" → MySQL tidak terjangkau / kredensial salah.
- Paket tidak muncul di `/graduates/` → jalankan `npm run db:migrate && npm run db:seed`.
# sukamotov4.0
