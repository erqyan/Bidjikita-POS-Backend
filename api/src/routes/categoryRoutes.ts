import { Router } from 'express';
import * as categoryController from '../controllers/categoryController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.post('/', authMiddleware, adminMiddleware, categoryController.createCategory);
router.get('/', categoryController.getCategories);
router.put('/:id', authMiddleware, adminMiddleware, categoryController.updateCategory);
router.delete('/:id', authMiddleware, adminMiddleware, categoryController.deleteCategory);

export default router;
