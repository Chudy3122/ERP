import { Router } from 'express';
import projectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', projectController.createProject.bind(projectController));
router.get('/', projectController.getAllProjects.bind(projectController));
router.get('/my', projectController.getUserProjects.bind(projectController));
router.get('/:id', projectController.getProjectById.bind(projectController));
router.put('/:id', projectController.updateProject.bind(projectController));
router.delete('/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.deleteProject.bind(projectController));

// Project members
router.get('/:id/members', projectController.getProjectMembers.bind(projectController));
router.post('/:id/members', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.addProjectMember.bind(projectController));
router.delete('/:id/members/:userId', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), projectController.removeProjectMember.bind(projectController));

// Project statistics
router.get('/:id/statistics', projectController.getProjectStatistics.bind(projectController));

export default router;
