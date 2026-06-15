import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

const UPLOAD_DIR = path.join(__dirname, '../../uploads/products');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });

export const uploadProductImage = (req: Request, res: Response, next: NextFunction) => {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: `Ukuran file maksimal ${MAX_SIZE_MB}MB` });
      }
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: (err as Error).message });
  });
};

// ── Bundle image upload ────────────────────────────────────────────────────
const BUNDLE_UPLOAD_DIR = path.join(__dirname, '../../uploads/bundles');

if (!fs.existsSync(BUNDLE_UPLOAD_DIR)) {
  fs.mkdirSync(BUNDLE_UPLOAD_DIR, { recursive: true });
}

const bundleStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BUNDLE_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = crypto.randomBytes(16).toString('hex');
    cb(null, `${unique}${ext}`);
  },
});

const uploadBundle = multer({ storage: bundleStorage, fileFilter, limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 } });

export const uploadBundleImage = (req: Request, res: Response, next: NextFunction) => {
  uploadBundle.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `Ukuran file maksimal ${MAX_SIZE_MB}MB` });
      return res.status(400).json({ message: err.message });
    }
    return res.status(400).json({ message: (err as Error).message });
  });
};
