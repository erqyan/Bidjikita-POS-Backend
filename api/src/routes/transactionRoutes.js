const express = require("express");

const router = express.Router();

const transactionController = require(
  "../controllers/transactionController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const adminMiddleware = require(
  "../middleware/adminMiddleware"
);

// CREATE TRANSACTION
// kasir & admin
router.post(
  "/",
  authMiddleware,
  transactionController.createTransaction
);

// GET ALL TRANSACTIONS
router.get(
  "/",
  authMiddleware,
  transactionController.getTransactions
);

// GET TRANSACTION BY ID
router.get(
  "/:id",
  authMiddleware,
  transactionController.getTransactionById
);

// UPDATE TRANSACTION
// admin only
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  transactionController.updateTransaction
);

// DELETE TRANSACTION
// admin only
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  transactionController.deleteTransaction
);

module.exports = router;