const express = require("express");

const router = express.Router();

const transactionController = require(
  "../controllers/transactionController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

// CREATE TRANSACTION
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
router.put(
  "/:id",
  authMiddleware,
  transactionController.updateTransaction
);

// DELETE TRANSACTION
router.delete(
  "/:id",
  authMiddleware,
  transactionController.deleteTransaction
);

module.exports = router;