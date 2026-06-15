import { Router } from 'express';
import * as userController from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';
import adminMiddleware from '../middleware/adminMiddleware';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.put('/:id/toggle-active', userController.toggleUserActive);
router.put('/:id/password', userController.changePassword);
router.delete('/:id', userController.deleteUser);

export default router;
