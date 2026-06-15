import { Router } from 'express';
import * as variantController from '../controllers/variantController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, variantController.createVariant);
router.get('/', variantController.getVariants);
router.get('/:id', variantController.getVariantById);
router.put('/:id', authMiddleware, adminMiddleware, variantController.updateVariant);
router.delete('/:id', authMiddleware, adminMiddleware, variantController.deleteVariant);

export default router;
