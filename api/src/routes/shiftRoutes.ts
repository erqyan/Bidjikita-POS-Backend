import { Router } from 'express';
import { getActiveShift, clockIn, clockOut } from '../controllers/shiftController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.get('/active', authMiddleware, getActiveShift);
router.post('/clock-in', authMiddleware, clockIn);
router.put('/clock-out', authMiddleware, clockOut);

export default router;
