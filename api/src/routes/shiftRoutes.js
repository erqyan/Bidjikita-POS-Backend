const express = require("express");

const router = express.Router();

const shiftController = require(
  "../controllers/shiftController"
);

const authMiddleware = require(
  "../middleware/authMiddleware"
);

const adminMiddleware = require(
  "../middleware/adminMiddleware"
);

// CREATE SHIFT
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  shiftController.createShift
);

// GET ALL SHIFTS
router.get(
  "/",
  authMiddleware,
  shiftController.getShifts
);

// GET SHIFT BY ID
router.get(
  "/:id",
  authMiddleware,
  shiftController.getShiftById
);

// UPDATE SHIFT
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  shiftController.updateShift
);

// DELETE SHIFT
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  shiftController.deleteShift
);

module.exports = router;