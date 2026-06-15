import { Router } from 'express';
import * as productController from '../controllers/productController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';
import { uploadProductImage } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, uploadProductImage, productController.createProduct);
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', authMiddleware, adminMiddleware, uploadProductImage, productController.updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, productController.deleteProduct);

export default router;
