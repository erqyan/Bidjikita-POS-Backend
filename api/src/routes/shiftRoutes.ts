import { Router } from 'express';
import { getActiveShift, clockIn, clockOut, getAllShifts, getShiftById } from '../controllers/shiftController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

// Cashier endpoints
router.get('/active', authMiddleware, getActiveShift);
router.post('/clock-in', authMiddleware, clockIn);
router.put('/clock-out', authMiddleware, clockOut);

// Admin endpoints
router.get('/', authMiddleware, adminMiddleware, getAllShifts);
router.get('/:id', authMiddleware, adminMiddleware, getShiftById);

export default router;
