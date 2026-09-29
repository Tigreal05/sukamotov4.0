# SEO AUDIT — SUKA MOTO (Phase 8)

Tanggal audit: 2026-09-29 · Commit baseline: `78256e7` (Phase 7)
Lingkungan: repo lokal `/workspace`, tanpa domain production.

## Klasifikasi halaman

| Tipe | URL | Indexable |
|---|---|---|
| PUBLIC INDEXABLE | `/`, `/graduates/`, `/wedding/`, `/event/`, `/invinite/` | ✅ (dengan syarat, lihat catatan) |
| PUBLIC / NOINDEX | `/invinite/demo-dark/` | ❌ noindex (halaman demo fiktif "Romeo & Juliet") |
| ERROR | `/404.html` + semua route tak dikenal (via `pageNotFound`) | ❌ noindex, HTTP 404 benar |
| PRIVATE / NOINDEX | `/admin/*` | N/A — **modul admin belum ada di repo** (ditemukan juga di Phase 6). Aturan robots.txt/sitemap tetap disiapkan untuk mengaturnya saat nanti dibuat. |
| API / NON-INDEXABLE | `/api/*` | ❌ Didisallow via robots.txt; tidak pernah masuk sitemap. |

## Temuan per halaman (sebelum perbaikan)

| URL | title unik | meta desc | canonical | H1 | OG | Twitter Card | JSON-LD | robots meta | favicon | Masalah utama |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | ✅ | ✅ (~117 char) | ❌ | ✅ 1 | partial (tanpa `og:url`, `og:site_name`; `og:image` = URL Unsplash eksternal) | ❌ | ❌ | ❌ | ❌ | Tidak ada canonical, Twitter Card, JSON-LD, favicon; og:image eksternal rapuh |
| `/graduates/` | ✅ | ✅ | ❌ | ✅ 1 | partial (tanpa `og:image`, `og:url`, `og:site_name`) | ❌ | ❌ | ❌ | ❌ | og:image hilang → preview sosial kosong |
| `/wedding/` | ✅ | ✅ (~55 char, pendek) | ❌ | ❌ **0 H1** | partial (tanpa `og:description`, `og:image`, `og:url`) | ❌ | ❌ | ❌ | ❌ | Konten utama hanya iframe Canva (tidak terbaca crawler), tanpa heading/teks deskriptif |
| `/event/` | ✅ | ✅ | ❌ | ✅ 1 | partial (tanpa `og:image`, `og:url`) | ❌ | ❌ | ❌ | ❌ | og:image hilang |
| `/invinite/` | ✅ | ✅ | ❌ | ✅ 1 | partial (tanpa `og:image`, `og:url`) | ❌ | ❌ | ❌ | ❌ | og:image hilang |
| `/invinite/demo-dark/` | ✅ | ✅ | ❌ | ✅ 1 | partial | ❌ | ❌ | ❌ **tidak noindex** | ❌ | Konten demo fiktif berisiko ter-index → duplikat/thin content |
| 404 (semua URL salah) | ✅ | ✅ | — | ✅ 1 | — | — | — | ✅ `noindex` | ❌ | HTTP status sudah benar 404 (`pageNotFound` → `res.status(404)`) ✔ |

## Temuan teknis global (sebelum perbaikan)

1. **`robots.txt` TIDAK ADA.**
2. **`sitemap.xml` TIDAK ADA.**
3. **Favicon TIDAK ADA** (tidak ada file maupun `<link rel="icon">`).
4. Canonical hilang di semua halaman; risiko duplicate content `/path` vs `/path/`.
5. Twitter Card hilang di semua halaman.
6. Structured data (JSON-LD) hilang. Yang bisa ditambahkan dengan jujur: `Organization` + `WebSite` + `BreadcrumbList` + `FAQPage` (konten FAQ memang ada di homepage). **Tidak** menambahkan `LocalBusiness` alamat/jam/rating/review karena data tidak tersedia — dilarang aturan phase (no fake data).
7. `og:image` homepage menunjuk CDN Unsplash eksternal; halaman lain tanpa gambar sama sekali.
8. `<html lang="id">` ✅ sudah benar di semua halaman; `<meta charset>` ✅; viewport ✅.
9. Heading hierarchy footer: `<h2>` dipakai untuk judul kolom footer di semua halaman — minor, dipertahankan (semantic cukup, tidak mengubah desain).
10. Internal linking ✅ baik: navbar/footer menauti semua halaman publik lewat HTML statis (bukan JS). Anchor text jelas ("Lihat Paket", "Hitung Estimasi").
11. Redirect lama `/invite` → `/invinite` (301) sudah ada dan langsung ke target (tanpa chain) ✅.
12. Image SEO: portfolio `alt` generik ("Contoh hasil foto SUKA MOTO n") — dapat diperbaiki; width/height/lazy ✅ dari Phase 7.
13. Domain production belum diketahui → canonical/OG/sitemap **tidak boleh hardcode domain palsu**; solusinya: konfigurasi `SITE_URL` + substitusi `https://__SITE_URL__` saat respons (middleware baru).

## Prioritas perbaikan

| # | Item | Prioritas |
|---|---|---|
| P1 | robots.txt (Disallow /admin/, /api/) + sitemap.xml | Tinggi |
| P1 | Canonical + Twitter Card + lengkapi OG (og:url, og:site_name, og:image) semua halaman publik | Tinggi |
| P1 | `noindex,follow` demo-dark; pastikan admin/API non-indexable | Tinggi |
| P2 | Favicon (SVG+ICO) + apple-touch-icon | Sedang |
| P2 | JSON-LD Organization/WebSite/Breadcrumb/FAQ (data riil saja) | Sedang |
| P2 | Wedding page: tambah H1 + paragraf deskriptif (iframe Canva tidak terbaca crawler) | Sedang |
| P3 | Perbaikan alt text, contextual internal links, meta description wedding lebih informatif | Rendah |
| — | Performance: pertahankan hasil Phase 7; hindari request tambahan untuk aset baru | Sedang |

## Status implementasi

Semua item P1–P3 di atas diimplementasikan pada Phase 8 — lihat `SEO_REPORT.md`.
