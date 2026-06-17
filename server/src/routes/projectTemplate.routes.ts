import { Router } from 'express';
import projectTemplateController from '../controllers/projectTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', projectTemplateController.getAllTemplates.bind(projectTemplateController));
router.get('/:id', projectTemplateController.getTemplateById.bind(projectTemplateController));

// Write routes: ADMIN + KIEROWNIK may create. Edit/delete is further checked in
// the controller — admin manages any template, kierownik only their own.
router.post(
  '/',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  projectTemplateController.createTemplate.bind(projectTemplateController)
);
router.put(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  projectTemplateController.updateTemplate.bind(projectTemplateController)
);
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]),
  projectTemplateController.deleteTemplate.bind(projectTemplateController)
);

export default router;
