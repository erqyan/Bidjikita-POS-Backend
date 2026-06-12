const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../uploads/products");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 5;

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

/**
 * Wraps upload.single() and returns proper 400 responses on multer errors
 * instead of passing them to the generic Express error handler.
 */
const uploadProductImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Ukuran file maksimal ${MAX_SIZE_MB}MB`,
        });
      }
      return res.status(400).json({ message: err.message });
    }

    // fileFilter rejection or other errors
    return res.status(400).json({ message: err.message });
  });
};

// ── Bundle image upload ────────────────────────────────────────────────────────

const BUNDLE_UPLOAD_DIR = path.join(__dirname, "../../uploads/bundles");

// Ensure directory exists
if (!fs.existsSync(BUNDLE_UPLOAD_DIR)) {
  fs.mkdirSync(BUNDLE_UPLOAD_DIR, { recursive: true });
}

const bundleStorage = multer.diskStorage({
  destination: (_req, _file, cb) => { cb(null, BUNDLE_UPLOAD_DIR); },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const uploadBundle = multer({ storage: bundleStorage, fileFilter, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });

const uploadBundleImage = (req, res, next) => {
  uploadBundle.single("image")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: `Ukuran file maksimal ${MAX_SIZE_MB}MB` });
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: err.message });
  });
};

module.exports = uploadProductImage;
module.exports.uploadBundleImage = uploadBundleImage;
