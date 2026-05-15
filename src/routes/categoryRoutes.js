const express = require("express");

const router = express.Router();

const categoryController = require(
  "../controllers/categoryController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const adminMiddleware = require(
  "../middleware/adminMiddleware"
);

// CREATE CATEGORY
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  categoryController.createCategory
);

// GET ALL CATEGORY
router.get(
  "/",
  categoryController.getCategories
);

// UPDATE CATEGORY
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryController.updateCategory
);

// DELETE CATEGORY
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  categoryController.deleteCategory
);

module.exports = router;