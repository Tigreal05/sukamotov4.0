// Pabrik aplikasi Express. Dipakai oleh server.js dan oleh test.
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

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

  // Static: HANYA folder public/ — source server, .env, database/, node_modules/ tidak tersaji.
  app.use(express.static(PUBLIC_DIR, { index: false, redirect: false, maxAge: isProd ? "1h" : 0 }));

  app.use(pageNotFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
