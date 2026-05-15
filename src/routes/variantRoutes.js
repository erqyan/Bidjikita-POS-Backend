const express = require("express");

const router = express.Router();

const variantController = require(
  "../controllers/variantController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const adminMiddleware = require(
  "../middleware/adminMiddleware"
);

// CREATE VARIANT
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  variantController.createVariant
);

// GET ALL VARIANTS
router.get(
  "/",
  variantController.getVariants
);

// GET VARIANT BY ID
router.get(
  "/:id",
  variantController.getVariantById
);

// UPDATE VARIANT
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  variantController.updateVariant
);

// DELETE VARIANT
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  variantController.deleteVariant
);

module.exports = router;