import { Request, Response } from 'express';
import departmentService from '../services/department.service';

export class DepartmentController {
  /**
   * Create new department
   * POST /api/departments
   */
  async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const department = await departmentService.createDepartment(req.body);
      res.status(201).json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all departments (flat list)
   * GET /api/departments
   */
  async getAllDepartments(req: Request, res: Response): Promise<void> {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const departments = await departmentService.getAllDepartments(includeInactive);
      res.json(departments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get department tree (hierarchical structure)
   * GET /api/departments/tree
   */
  async getDepartmentTree(req: Request, res: Response): Promise<void> {
    try {
      const tree = await departmentService.getDepartmentTree();
      res.json(tree);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get department by ID
   * GET /api/departments/:id
   */
  async getDepartmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const department = await departmentService.getDepartmentById(id);
      res.json(department);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update department
   * PUT /api/departments/:id
   */
  async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const department = await departmentService.updateDepartment(id, req.body);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete department
   * DELETE /api/departments/:id
   */
  async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await departmentService.deleteDepartment(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get employees in department
   * GET /api/departments/:id/employees
   */
  async getDepartmentEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employees = await departmentService.getDepartmentEmployees(id);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Assign employee to department
   * POST /api/departments/:id/employees
   */
  async assignEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const user = await departmentService.assignEmployee(id, userId);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Remove employee from department
   * DELETE /api/departments/:id/employees/:userId
   */
  async removeEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id, userId } = req.params;
      await departmentService.removeEmployee(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Set department head
   * PUT /api/departments/:id/head
   */
  async setDepartmentHead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const department = await departmentService.setDepartmentHead(id, userId || null);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Move department in hierarchy
   * PUT /api/departments/:id/move
   */
  async moveDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newParentId } = req.body;
      const department = await departmentService.moveDepartment(id, newParentId || null);
      res.json(department);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get org chart data
   * GET /api/departments/org-chart
   */
  async getOrgChart(req: Request, res: Response): Promise<void> {
    try {
      const orgChart = await departmentService.getOrgChartData();
      res.json(orgChart);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get employee hierarchy
   * GET /api/departments/employee-hierarchy/:userId
   */
  async getEmployeeHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const hierarchy = await departmentService.getEmployeeHierarchy(userId);
      res.json(hierarchy);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }
}

export default new DepartmentController();
