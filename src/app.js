// Pabrik aplikasi Express. Dipakai oleh server.js dan oleh test.
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const zlib = require("zlib");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { staticCache, assetUrl } = require("./middleware/static-cache"); // Phase 7: cache + versioning aset

require("./config/env"); // memuat .env + validasi keamanan startup (lihat config/env-check.js)

const { apiLimiter } = require("./middleware/rate-limit");
const { apiNotFound, pageNotFound } = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");
const requestLog = require("./middleware/request-log");
const logger = require("./config/logger");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function isProduction() {
  return process.env.NODE_ENV === "production";
}

// Allowlist origin CORS dari env. Tanpa wildcard untuk API.
function corsOrigins() {
  const fallback = isProduction() ? "" : "http://localhost:3000,http://127.0.0.1:3000";
  return (process.env.CORS_ORIGINS ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);
}

function cspDirectives(isProd) {
  return {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    scriptSrc: ["'self'"], // tanpa inline/eval — semua JS site memakai file eksternal
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
    imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://images.unsplash.com"],
    mediaSrc: ["'self'", "https://files.catbox.moe"],
    frameSrc: ["'self'", "https://www.canva.com"],
    frameAncestors: ["'none'"], // anti clickjacking (termasuk halaman undangan yang di-embed pemiliknya sendiri)
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: isProd ? [] : null,
  };
}

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Kepercayaan reverse proxy hanya bila dikonfigurasi eksplisit (Nginx/ELB di depan app).
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
  } else if (isProduction()) {
    // Default aman Express (proxy tidak dipercaya) — IP rate-limit bisa salah di belakang proxy; lihat SECURITY.md.
    logger.warn("trust_proxy_unset", { hint: "Set TRUST_PROXY=<jumlah proxy> saat deploy di belakang reverse proxy" });
  }

  const isProd = isProduction();
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: cspDirectives(isProd) },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false, // halaman menampilkan gambar/iframe pihak ketiga (portfolio)
  }));

  app.use(requestLog);

  const allowed = corsOrigins();
  app.use("/api", cors({
    origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
    methods: ["GET", "POST"],
    maxAge: 600,
  }));

  // Batas body kecil — payload booking/contact jauh di bawah ini; mengurangi risiko memory abuse.
  app.use(express.json({ limit: "20kb" }));
  app.use("/api", apiLimiter);

  app.use("/api/health", require("./routes/health.routes"));
  app.use("/api/services", require("./routes/services.routes"));
  app.use("/api/packages", require("./routes/packages.routes"));
  app.use("/api/addons", require("./routes/addons.routes"));
  app.use("/api/bookings", require("./routes/bookings.routes"));
  app.use("/api/contact", require("./routes/contact.routes"));
  app.use("/api", apiNotFound);

  app.use("/invite", (req, res) => res.redirect(301, `/invinite${req.url}`));

  // BUG-002 (Phase 6): sebelumnya index:false & redirect:false membuat "/" dan
  // "/graduates/" dst. mengembalikan 404 padahal internal links memakai trailing slash.
  // Static: HANYA folder public/ — source server, .env, database/, node_modules/ tetap tidak tersaji.

  // Phase 7 (perf): pre-compress CSS/JS yang dikirim mentah + Cache-Control terpisah:
  // aset statis /assets/* = immutable 1 tahun (di-version via ?v=<hash>, lihat middleware/static-cache.js),
  // HTML tetap no-cache agar perubahan halaman langsung terlihat.
  app.use(staticCache(PUBLIC_DIR));
  app.use(express.static(PUBLIC_DIR, { maxAge: isProd ? "1h" : 0 }));

  // Phase 7 (perf): injeksi versi aset (?v=hash) ke <link>/<script> di HTML publik saat respons,
  // sehingga browser boleh meng-cache aset dengan aman tanpa risiko versi lama menempel.
  const ASSET_VERSION = assetVersion(PUBLIC_DIR);
  app.use(assetUrl(ASSET_VERSION));

  app.use(pageNotFound);
  app.use(errorHandler);
  return app;
}

// Hash singkat isi seluruh CSS+JS untuk cache-busting (diubah hanya saat file berubah).
function assetVersion(publicDir) {
  try {
    const hash = crypto.createHash("sha256");
    for (const dir of ["css", "js"]) {
      const abs = path.join(publicDir, "assets", dir);
      if (!fs.existsSync(abs)) continue;
      for (const f of fs.readdirSync(abs).sort()) {
        hash.update(f).update(fs.readFileSync(path.join(abs, f)));
      }
    }
    return hash.digest("hex").slice(0, 10);
  } catch (e) {
    return String(Date.now());
  }
}

module.exports = { createApp };
