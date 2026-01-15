import { Router } from 'express';
import employeeController from '../controllers/employee.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Special queries (before :id routes)
router.get('/anniversaries', employeeController.getUpcomingAnniversaries.bind(employeeController));
router.get('/departments/statistics', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), employeeController.getDepartmentStatistics.bind(employeeController));
router.get('/department/:department', employeeController.getEmployeesByDepartment.bind(employeeController));

// Employee list
router.get('/', employeeController.getAllEmployees.bind(employeeController));

// Employee profile
router.get('/:id', employeeController.getEmployeeProfile.bind(employeeController));
router.put('/:id', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), employeeController.updateEmployeeProfile.bind(employeeController));

// Employee management
router.put('/:id/manager', requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]), employeeController.assignManager.bind(employeeController));
router.get('/:id/team', employeeController.getTeamMembers.bind(employeeController));

// Employee statistics
router.get('/:id/statistics', employeeController.getEmployeeStatistics.bind(employeeController));
router.get('/:id/work-summary', employeeController.getEmployeeWorkSummary.bind(employeeController));

export default router;
