import { Router } from 'express';
import departmentController from '../controllers/department.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Read operations - all authenticated users
router.get('/', departmentController.getAllDepartments.bind(departmentController));
router.get('/tree', departmentController.getDepartmentTree.bind(departmentController));
router.get('/org-chart', departmentController.getOrgChart.bind(departmentController));
router.get('/employee-hierarchy/:userId', departmentController.getEmployeeHierarchy.bind(departmentController));
router.get('/:id', departmentController.getDepartmentById.bind(departmentController));
router.get('/:id/employees', departmentController.getDepartmentEmployees.bind(departmentController));

// Write operations - admin only
router.post('/', requireRole([UserRole.ADMIN]), departmentController.createDepartment.bind(departmentController));
router.put('/:id', requireRole([UserRole.ADMIN]), departmentController.updateDepartment.bind(departmentController));
router.delete('/:id', requireRole([UserRole.ADMIN]), departmentController.deleteDepartment.bind(departmentController));
router.post('/:id/employees', requireRole([UserRole.ADMIN]), departmentController.assignEmployee.bind(departmentController));
router.delete('/:id/employees/:userId', requireRole([UserRole.ADMIN]), departmentController.removeEmployee.bind(departmentController));
router.put('/:id/head', requireRole([UserRole.ADMIN]), departmentController.setDepartmentHead.bind(departmentController));
router.put('/:id/move', requireRole([UserRole.ADMIN]), departmentController.moveDepartment.bind(departmentController));

export default router;
