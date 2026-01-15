import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware([UserRole.ADMIN]));

// System statistics
router.get('/stats', adminController.getSystemStats);
router.get('/online-count', adminController.getOnlineCount);
router.get('/recent-registrations', adminController.getRecentRegistrations);

// User management
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// User actions
router.post('/users/:id/activate', adminController.activateUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.get('/users/:id/activity', adminController.getUserActivity);

export default router;
