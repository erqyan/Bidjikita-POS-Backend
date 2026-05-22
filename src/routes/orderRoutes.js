const express = require("express");

const router = express.Router();

const orderController = require(
  "../controllers/orderController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

// CREATE ORDER
router.post(
  "/",
  authMiddleware,
  orderController.createOrder
);

// GET ALL ORDERS
router.get(
  "/",
  authMiddleware,
  orderController.getOrders
);

// GET ORDER BY ID
router.get(
  "/:id",
  authMiddleware,
  orderController.getOrderById
);

// UPDATE ORDER
router.put(
  "/:id",
  authMiddleware,
  orderController.updateOrder
);

// DELETE ORDER
router.delete(
  "/:id",
  authMiddleware,
  orderController.deleteOrder
);

module.exports = router;