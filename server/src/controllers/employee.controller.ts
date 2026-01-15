import { Request, Response } from 'express';
import employeeService from '../services/employee.service';

export class EmployeeController {
  /**
   * Get employee profile
   * GET /api/employees/:id
   */
  async getEmployeeProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeService.getEmployeeProfile(id);
      res.json(employee);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update employee profile
   * PUT /api/employees/:id
   */
  async updateEmployeeProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updatedBy = req.user!.userId;
      const employee = await employeeService.updateEmployeeProfile(id, req.body, updatedBy);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all employees
   * GET /api/employees
   */
  async getAllEmployees(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        department: req.query.department as string,
        position: req.query.position as string,
        role: req.query.role as 'ADMIN' | 'TEAM_LEADER' | 'EMPLOYEE',
        managerId: req.query.managerId as string,
        contractType: req.query.contractType as string,
        search: req.query.search as string,
      };

      const pagination = req.query.page
        ? {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
          }
        : undefined;

      const result = await employeeService.getAllEmployees(filters, pagination);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get employees by department
   * GET /api/employees/department/:department
   */
  async getEmployeesByDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { department } = req.params;
      const employees = await employeeService.getEmployeesByDepartment(department);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Assign manager to employee
   * PUT /api/employees/:id/manager
   */
  async assignManager(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { managerId } = req.body;
      const assignedBy = req.user!.userId;

      const employee = await employeeService.assignManager(id, managerId, assignedBy);
      res.json(employee);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get team members
   * GET /api/employees/:id/team
   */
  async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const teamMembers = await employeeService.getTeamMembers(id);
      res.json(teamMembers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get employee statistics
   * GET /api/employees/:id/statistics
   */
  async getEmployeeStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const stats = await employeeService.getEmployeeStatistics(id, year, month);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get employee work summary
   * GET /api/employees/:id/work-summary
   */
  async getEmployeeWorkSummary(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const summary = await employeeService.getEmployeeWorkSummary(id);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get upcoming anniversaries
   * GET /api/employees/anniversaries
   */
  async getUpcomingAnniversaries(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const employees = await employeeService.getUpcomingAnniversaries(days);
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get department statistics
   * GET /api/employees/departments/statistics
   */
  async getDepartmentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const department = req.query.department as string;
      const stats = await employeeService.getDepartmentStatistics(department);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new EmployeeController();
