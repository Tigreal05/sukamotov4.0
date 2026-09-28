const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

exports.apiNotFound = (req, res) => {
  res.status(404).json({ success: false, message: "Resource not found" });
};

exports.pageNotFound = (req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
};
