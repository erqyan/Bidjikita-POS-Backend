const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// CREATE PRODUCT
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  productController.createProduct
);

// GET ALL PRODUCTS
router.get(
  "/",
  productController.getProducts
);

// GET PRODUCT BY ID
router.get(
  "/:id",
  productController.getProductById
);

// UPDATE PRODUCT
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.updateProduct
);

// DELETE PRODUCT
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.deleteProduct
);

// UPDATE PRODUCT PRICING
router.put(
  "/:id/pricing",
  authMiddleware,
  adminMiddleware,
  productController.updateProductPricing
);

module.exports = router;