import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/summary', analyticsController.getSummary);
router.get('/revenue', analyticsController.getRevenueTrend);
router.get('/top-products', analyticsController.getTopProducts);
router.get('/payment-methods', analyticsController.getPaymentMethodStats);
router.get('/low-stock', analyticsController.getLowStockMaterials);
router.get('/profit', analyticsController.getProfitTrend);
router.get('/financial-report', analyticsController.getFinancialReport);

export default router;
