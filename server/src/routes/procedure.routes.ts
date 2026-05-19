import { Router } from 'express';
import procedureController from '../controllers/procedure.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);

router.get('/', procedureController.getAll.bind(procedureController));
router.get('/:id', procedureController.getById.bind(procedureController));
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  procedureController.create.bind(procedureController),
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  procedureController.update.bind(procedureController),
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  procedureController.delete.bind(procedureController),
);

export default router;
