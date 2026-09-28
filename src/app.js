const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const { apiLimiter } = require("./middleware/rate-limit");
const { apiNotFound, pageNotFound } = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const PUBLIC_DIR = path.join(__dirname, "..", "public");

function corsOrigins() {
  const fallback = process.env.NODE_ENV === "production" ? "" : "http://localhost:3000,http://127.0.0.1:3000";
  return (process.env.CORS_ORIGINS ?? fallback).split(",").map((s) => s.trim()).filter(Boolean);
}

function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY) {
    app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);
  }

  const isProd = process.env.NODE_ENV === "production";
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
        mediaSrc: ["'self'", "https://files.catbox.moe"],
        frameSrc: ["https://www.canva.com"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
  }));

  const allowed = corsOrigins();
  app.use("/api", cors({
    origin: (origin, cb) => cb(null, !origin || allowed.includes(origin)),
    methods: ["GET", "POST"],
  }));
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
  app.use(express.static(PUBLIC_DIR));

  app.use(pageNotFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
