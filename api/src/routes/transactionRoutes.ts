import { Router } from 'express';
import * as transactionController from '../controllers/transactionController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.post('/', authMiddleware, transactionController.createTransaction);
router.get('/', authMiddleware, transactionController.getTransactions);
router.get('/:id', authMiddleware, transactionController.getTransactionById);
router.put('/:id', authMiddleware, adminMiddleware, transactionController.updateTransaction);
router.delete('/:id', authMiddleware, adminMiddleware, transactionController.deleteTransaction);

export default router;
