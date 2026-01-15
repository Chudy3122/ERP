import { Router } from 'express';
import taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard deadline queries (before :id routes)
router.get('/upcoming-deadlines', taskController.getUpcomingDeadlines.bind(taskController));
router.get('/due-today', taskController.getTasksDueToday.bind(taskController));
router.get('/due-tomorrow', taskController.getTasksDueTomorrow.bind(taskController));

// User tasks
router.get('/my', taskController.getUserTasks.bind(taskController));

// Project tasks
router.get('/project/:projectId', taskController.getProjectTasks.bind(taskController));
router.get('/project/:projectId/kanban', taskController.getTasksGroupedByStatus.bind(taskController));

// Task CRUD
router.post('/', taskController.createTask.bind(taskController));
router.get('/', taskController.getAllTasks.bind(taskController));
router.get('/:id', taskController.getTaskById.bind(taskController));
router.put('/:id', taskController.updateTask.bind(taskController));
router.delete('/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), taskController.deleteTask.bind(taskController));

// Task actions
router.put('/:id/assign', taskController.assignTask.bind(taskController));
router.put('/:id/status', taskController.updateTaskStatus.bind(taskController));

export default router;
