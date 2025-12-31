import { Request, Response } from 'express';
import userStatusService from '../services/userStatus.service';
import { StatusType } from '../models/UserStatus.model';

class UserStatusController {
  /**
   * Get current user's status
   * GET /api/status/me
   */
  async getMyStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await userStatusService.getOrCreateStatus(userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error fetching user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch status',
      });
    }
  }

  /**
   * Update current user's status
   * PUT /api/status/me
   */
  async updateMyStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, custom_message } = req.body;

      // Validate status type
      if (!Object.values(StatusType).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status type',
        });
        return;
      }

      const updatedStatus = await userStatusService.updateStatus(
        userId,
        status,
        custom_message
      );

      res.json({
        success: true,
        data: updatedStatus,
        message: 'Status updated successfully',
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status',
      });
    }
  }

  /**
   * Get another user's status
   * GET /api/status/user/:userId
   */
  async getUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const status = await userStatusService.getUserStatus(userId);

      if (!status) {
        res.status(404).json({
          success: false,
          message: 'User status not found',
        });
        return;
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error fetching user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user status',
      });
    }
  }

  /**
   * Get multiple users' statuses
   * POST /api/status/batch
   */
  async getBatchStatuses(req: Request, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds)) {
        res.status(400).json({
          success: false,
          message: 'userIds must be an array',
        });
        return;
      }

      const statuses = await userStatusService.getMultipleStatuses(userIds);

      res.json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      console.error('Error fetching batch statuses:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statuses',
      });
    }
  }

  /**
   * Get all online users
   * GET /api/status/online
   */
  async getOnlineUsers(req: Request, res: Response): Promise<void> {
    try {
      const onlineUsers = await userStatusService.getOnlineUsers();

      res.json({
        success: true,
        data: onlineUsers,
      });
    } catch (error) {
      console.error('Error fetching online users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch online users',
      });
    }
  }

  /**
   * Get status statistics (admin only)
   * GET /api/status/stats
   */
  async getStatusStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await userStatusService.getStatusStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching status stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch status statistics',
      });
    }
  }

  /**
   * Set status to online
   * POST /api/status/online
   */
  async setOnline(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await userStatusService.setOnline(userId);

      res.json({
        success: true,
        data: status,
        message: 'Status set to online',
      });
    } catch (error) {
      console.error('Error setting online status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set online status',
      });
    }
  }

  /**
   * Set status to offline
   * POST /api/status/offline
   */
  async setOffline(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await userStatusService.setOffline(userId);

      res.json({
        success: true,
        data: status,
        message: 'Status set to offline',
      });
    } catch (error) {
      console.error('Error setting offline status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set offline status',
      });
    }
  }

  /**
   * Set status to away
   * POST /api/status/away
   */
  async setAway(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { custom_message } = req.body;
      const status = await userStatusService.setAway(userId, custom_message);

      res.json({
        success: true,
        data: status,
        message: 'Status set to away',
      });
    } catch (error) {
      console.error('Error setting away status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set away status',
      });
    }
  }

  /**
   * Set status to busy
   * POST /api/status/busy
   */
  async setBusy(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { custom_message } = req.body;
      const status = await userStatusService.setBusy(userId, custom_message);

      res.json({
        success: true,
        data: status,
        message: 'Status set to busy',
      });
    } catch (error) {
      console.error('Error setting busy status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set busy status',
      });
    }
  }

  /**
   * Set status to in meeting
   * POST /api/status/in-meeting
   */
  async setInMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { custom_message } = req.body;
      const status = await userStatusService.setInMeeting(userId, custom_message);

      res.json({
        success: true,
        data: status,
        message: 'Status set to in meeting',
      });
    } catch (error) {
      console.error('Error setting in meeting status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set in meeting status',
      });
    }
  }
}

export default new UserStatusController();
