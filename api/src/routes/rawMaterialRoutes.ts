import { Router } from 'express';
import * as rawMaterialController from '../controllers/rawMaterialController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, rawMaterialController.createRawMaterial);
router.get('/', authMiddleware, rawMaterialController.getRawMaterials);
router.get('/:id', authMiddleware, rawMaterialController.getRawMaterialById);
router.put('/:id', authMiddleware, adminMiddleware, rawMaterialController.updateRawMaterial);
router.delete('/:id', authMiddleware, adminMiddleware, rawMaterialController.deleteRawMaterial);
router.get('/:id/logs', authMiddleware, rawMaterialController.getMaterialLogs);

export default router;
