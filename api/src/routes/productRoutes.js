const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const uploadProductImage = require("../middleware/uploadMiddleware");

// CREATE PRODUCT (accepts nested variants)
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  uploadProductImage,
  productController.createProduct
);

// GET ALL PRODUCTS
router.get("/", productController.getProducts);

// GET PRODUCT BY ID
router.get("/:id", productController.getProductById);

// UPDATE PRODUCT (accepts nested variants)
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  uploadProductImage,
  productController.updateProduct
);

// DELETE PRODUCT
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  productController.deleteProduct
);

module.exports = router;
