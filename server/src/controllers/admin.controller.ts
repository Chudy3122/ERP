import { Request, Response } from 'express';
import adminService from '../services/admin.service';
import { UserRole } from '../models/User.model';

class AdminController {
  /**
   * Get all users
   * GET /api/admin/users
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as UserRole;

      const result = await adminService.getAllUsers(page, limit, search, role);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/admin/users/:id
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await adminService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
      });
    }
  }

  /**
   * Create user
   * POST /api/admin/users
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, role, department, phone } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        res.status(400).json({
          success: false,
          message: 'Email, password, firstName, lastName, and role are required',
        });
        return;
      }

      const user = await adminService.createUser({
        email,
        password,
        firstName,
        lastName,
        role,
        department,
        phone,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create user',
      });
    }
  }

  /**
   * Update user
   * PUT /api/admin/users/:id
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        email,
        firstName,
        lastName,
        role,
        department,
        phone,
        position,
        employee_id,
        hire_date,
        contract_type,
        manager_id,
        working_hours_per_day,
        annual_leave_days,
        isActive,
      } = req.body;

      const user = await adminService.updateUser(id, {
        email,
        firstName,
        lastName,
        role,
        department,
        phone,
        position,
        employee_id,
        hire_date,
        contract_type,
        manager_id,
        working_hours_per_day,
        annual_leave_days,
        isActive,
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update user',
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/admin/users/:id
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await adminService.deleteUser(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
    }
  }

  /**
   * Deactivate user
   * POST /api/admin/users/:id/deactivate
   */
  async deactivateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await adminService.deactivateUser(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      console.error('Error deactivating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to deactivate user',
      });
    }
  }

  /**
   * Activate user
   * POST /api/admin/users/:id/activate
   */
  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const user = await adminService.activateUser(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User activated successfully',
      });
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate user',
      });
    }
  }

  /**
   * Reset user password
   * POST /api/admin/users/:id/reset-password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        res.status(400).json({
          success: false,
          message: 'New password is required',
        });
        return;
      }

      const success = await adminService.resetUserPassword(id, newPassword);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password',
      });
    }
  }

  /**
   * Get system statistics
   * GET /api/admin/stats
   */
  async getSystemStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getSystemStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
      });
    }
  }

  /**
   * Get user activity
   * GET /api/admin/users/:id/activity
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const activity = await adminService.getUserActivity(id);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      console.error('Error fetching user activity:', error);
      res.status(error.message === 'User not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to fetch user activity',
      });
    }
  }

  /**
   * Get recent registrations
   * GET /api/admin/recent-registrations
   */
  async getRecentRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const users = await adminService.getRecentRegistrations(limit);

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching recent registrations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent registrations',
      });
    }
  }

  /**
   * Get online users count
   * GET /api/admin/online-count
   */
  async getOnlineCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await adminService.getOnlineUsersCount();

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Error fetching online count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online count',
      });
    }
  }
}

export default new AdminController();
