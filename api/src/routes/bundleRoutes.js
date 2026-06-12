const express = require("express");
const router = express.Router();

const bundleController = require("../controllers/bundleController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { uploadBundleImage } = require("../middleware/uploadMiddleware");

// CREATE BUNDLE (Admin only)
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  uploadBundleImage,
  bundleController.createBundle
);

// GET ALL BUNDLES (Active only - Public)
router.get(
  "/",
  bundleController.getBundles
);

// GET ALL BUNDLES (Including inactive - Admin only)
router.get(
  "/all/admin",
  authMiddleware,
  adminMiddleware,
  bundleController.getAllBundles
);

// GET BUNDLE BY ID
router.get(
  "/:id",
  bundleController.getBundleById
);

// UPDATE BUNDLE (Admin only)
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  uploadBundleImage,
  bundleController.updateBundle
);

// DELETE BUNDLE (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  bundleController.deleteBundle
);

// TOGGLE ACTIVE STATE (Admin only)
router.patch(
  "/:id/toggle-active",
  authMiddleware,
  adminMiddleware,
  bundleController.toggleActive
);

module.exports = router;
