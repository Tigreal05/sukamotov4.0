// Phase 7 — Frontend Performance: cache strategy + compression untuk aset statis.
// Tanpa dependency baru (zlib bawaan Node; sesuai stack proyek).
//
// Strategi:
// - /assets/* (CSS/JS/gambar): Cache-Control "public, max-age=31536000, immutable".
//   Aman karena HTML menginjeksi ?v=<hash-isi> (lihat assetUrl di bawah) sehingga
//   perubahan aset menghasilkan URL baru — tidak ada versi lama menempel di browser.
// - CSS/JS dikirim gzip saat klien mendukungnya dan file belum punya Content-Encoding
//   (mis. pre-compressed .br/.gz yang di-serve express.static). Brotli sengaja tidak
//   dihitung per-request di sini (overhead CPU > manfaat untuk file <10KB); reverse
//   proxy produksi (Nginx brotli) dapat menggantikannya — didokumentasikan di PERFORMANCE.md.
// - HTML TIDAK disentuh di sini: tetap no-cache/ETag via express.static default,
//   supaya konten halaman selalu fresh.

"use strict";

const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

const COMPRESSIBLE = /\.(css|js)$/i;
const ASSET_PREFIX = "/assets/";

// Map path -> buffer gzip, diisi on-demand sekali per file per proses.
const gzCache = new Map();

function gzipFor(absPath) {
  if (gzCache.has(absPath)) return gzCache.get(absPath);
  let buf = null;
  try {
    const raw = fs.readFileSync(absPath);
    buf = zlib.gzipSync(raw, { level: 9 });
    if (buf.length >= raw.length) buf = null; // sudah termampatkan/kecil — kirim mentah
  } catch (e) {
    buf = null;
  }
  gzCache.set(absPath, buf);
  return buf;
}

// staticCache(publicDir): middleware yang HANYA melayani /assets/*.css|js dengan
// gzip + header cache panjang. Permintaan lain diteruskan ke express.static biasa.
function staticCache(publicDir) {
  return function serveCachedAsset(req, res, next) {
    const urlPath = decodeURIComponent((req.path || "").split("?")[0]);
    if (!urlPath.startsWith(ASSET_PREFIX) || !COMPRESSIBLE.test(urlPath)) {
      // HTML & gambar: atur caching terpisah, biarkan express.static mengirim isi.
      if (urlPath.startsWith(ASSET_PREFIX)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (/\.html?$/i.test(urlPath) || !path.extname(urlPath)) {
        res.setHeader("Cache-Control", "no-cache"); // revalidasi via ETag/Last-Modified
      }
      return next();
    }
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    const abs = path.join(publicDir, urlPath);
    // Path traversal guard: pastikan tetap di dalam publicDir.
    const root = path.resolve(publicDir);
    if (!abs.startsWith(root + path.sep)) return next();
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return next();

    const acceptsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] || "");
    let body = null;
    if (acceptsGzip) body = gzipFor(abs);

    res.setHeader("Vary", "Accept-Encoding");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    if (body) {
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Content-Type", /\.css$/.test(abs) ? "text/css; charset=UTF-8" : "application/javascript; charset=UTF-8");
      res.setHeader("Content-Length", body.length);
      return req.method === "HEAD" ? res.end() : res.end(body);
    }
    const raw = fs.readFileSync(abs);
    res.setHeader("Content-Length", raw.length);
    return req.method === "HEAD" ? res.end() : res.end(raw);
  };
}

// assetUrl(version): middleware pasca-static yang menyuntik ?v=<version> pada
// referensi <link rel="stylesheet"> dan <script src> ke /assets/ di respons HTML.
// Revisi aset tersimpan di memory (bukan ditulis ke disk) — source tetap readable.
//
// Phase 8 (SEO): middleware yang sama juga mengganti placeholder absolut
// https://__SITE_URL__ dengan SITE_URL environment saat runtime. Canonical,
// og:url, twitter:image, sitemap, dan JSON-LD ditulis dengan placeholder di
// source HTML sehingga tidak ada domain palsu yang di-hardcode; deploy tinggal
// mengisi SITE_URL=https://domain-asli.com di .env.
function assetUrl(version) {
  const tag = String(version).replace(/[^a-z0-9]/gi, "");
  const siteUrl = resolveSiteUrl();
  return function rewriteAssetUrls(req, res, next) {
    if (req.method !== "GET") return next();
    const origSend = res.send.bind(res);
    res.send = function (body) {
      if (typeof body !== "string") return origSend(body);
      let changed = false;
      if (body.includes("/assets/") && /<link|<script/.test(body)) {
        body = body.replace(
          /((?:href|src)="\/assets\/[^"?]+)(?:"|\?[^"]*")/g,
          (m, prefix) => { changed = true; return prefix + "?v=" + tag + '"'; }
        );
      }
      // Substitusi domain hanya bila token placeholder benar-benar ada —
      // tidak menyentuh header Location redirect maupun konten lain.
      if (body.includes("__SITE_URL__")) {
        // {{CANONICAL_PATH}} -> path URL yang sedang diminta, dinormalisasi ke bentuk
        // canonical trailing-slash (/wedding -> /wedding/), agar canonical selalu
        // self-referencing dan konsisten meski halaman diakses dari alias tanpa slash.
        let cp = canonicalPathForRequest(req);
        body = body.split("{{CANONICAL_PATH}}").join(cp);
        body = body.split("https://__SITE_URL__").join(siteUrl);
        changed = true;
      }
      if (changed && !res.hasHeader("Content-Encoding")) {
        // Jangan pernah menulis Content-Length mentah di atas body gzip (express.static
        // dapat mengirim .gz pre-compressed dengan Content-Encoding tersimpan).
        res.setHeader("Content-Length", Buffer.byteLength(body));
      }
      return origSend(body);
    };
    next();
  };
}

// SITE_URL normalisasi: tanpa trailing slash, wajib ber-skema http(s).
// Default dev mengikuti PORT aktif (bukan hardcode 3000) supaya canonical/og:url/sitemap
// self-referencing benar saat server berjalan di port acak (mis. dalam automated tests).
// Production tanpa SITE_URL -> peringatan logger + fallback localhost:<PORT>.
function resolveSiteUrl() {
  const logger = require("../config/logger");
  let raw = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (!raw) {
    const port = Number.parseInt(process.env.PORT || "3000", 10) || 3000;
    if (process.env.NODE_ENV === "production") {
      logger.warn("site_url_unset", { hint: "Set SITE_URL=https://domain-anda di .env production; canonical/sitemap memakai fallback localhost." });
    }
    raw = `http://localhost:${port}`;
  }
  if (!/^https?:\/\//.test(raw)) raw = "https://" + raw.replace(/^\/\//, "");
  return raw;
}

// Path canonical untuk halaman yang diminta: buang query string, pastikan trailing slash.
function canonicalPathForRequest(req) {
  let cp = ((req && req.path) || "/").split("?")[0];
  if (!cp.endsWith("/")) cp += "/";
  return cp;
}

module.exports = { staticCache, assetUrl, resolveSiteUrl, canonicalPathForRequest };
