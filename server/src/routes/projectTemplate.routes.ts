import { Router } from 'express';
import projectTemplateController from '../controllers/projectTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read routes (available to all authenticated users)
router.get('/', projectTemplateController.getAllTemplates.bind(projectTemplateController));
router.get('/:id', projectTemplateController.getTemplateById.bind(projectTemplateController));

// Write routes: any authenticated user may create/duplicate. Edit/delete are
// checked in the controller — admin manages any template, others only their own.
router.post('/', projectTemplateController.createTemplate.bind(projectTemplateController));
router.put('/:id', projectTemplateController.updateTemplate.bind(projectTemplateController));
router.delete('/:id', projectTemplateController.deleteTemplate.bind(projectTemplateController));

export default router;
