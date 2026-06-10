const express = require("express");

const router = express.Router();

const rawMaterialController = require(
  "../controllers/rawMaterialController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const adminMiddleware = require(
  "../middleware/adminMiddleware"
);

// CREATE
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  rawMaterialController.createRawMaterial
);

// GET ALL
router.get(
  "/",
  authMiddleware,
  rawMaterialController.getRawMaterials
);

// GET BY ID
router.get(
  "/:id",
  authMiddleware,
  rawMaterialController.getRawMaterialById
);

// UPDATE
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  rawMaterialController.updateRawMaterial
);

// DELETE
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  rawMaterialController.deleteRawMaterial
);

module.exports = router;