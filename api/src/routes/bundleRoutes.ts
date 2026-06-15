import { Router } from 'express';
import * as bundleController from '../controllers/bundleController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';
import { uploadBundleImage } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, uploadBundleImage, bundleController.createBundle);
router.get('/', bundleController.getBundles);
router.get('/all/admin', authMiddleware, adminMiddleware, bundleController.getAllBundles);
router.get('/:id', bundleController.getBundleById);
router.put('/:id', authMiddleware, adminMiddleware, uploadBundleImage, bundleController.updateBundle);
router.delete('/:id', authMiddleware, adminMiddleware, bundleController.deleteBundle);
router.patch('/:id/toggle-active', authMiddleware, adminMiddleware, bundleController.toggleActive);

export default router;
