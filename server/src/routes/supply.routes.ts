import { Router } from 'express';
import supplyController from '../controllers/supply.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);

const MANAGER_ROLES = [UserRole.SEKRETARIAT, UserRole.ADMIN];

// List (managers see all, others see own) + own list
router.get('/', supplyController.getAll);
router.get('/mine', supplyController.getMine);

// Any logged-in user can submit a request
router.post('/', supplyController.create);

// Edit — owner (own pending) or admin (any); enforced in service
router.put('/:id', supplyController.update);

// Approve / reject — sekretariat + admin only
router.put('/:id/approve', requireRole(MANAGER_ROLES), supplyController.approve);
router.put('/:id/reject', requireRole(MANAGER_ROLES), supplyController.reject);

// Delete — owner (own pending) or manager
router.delete('/:id', supplyController.delete);

export default router;
