import { Request, Response } from 'express';
import { TimeService } from '../services/time.service';
import { LeaveType } from '../models/LeaveRequest.model';
import notificationService from '../services/notification.service';
import adminService from '../services/admin.service';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.model';

const timeService = new TimeService();

export class TimeController {
  // ===== TIME ENTRIES =====

  /**
   * Clock in
   * POST /api/time/clock-in
   */
  async clockIn(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notes, expectedClockIn } = req.body;

      const timeEntry = await timeService.clockIn(userId, notes, expectedClockIn);

      res.status(201).json({
        success: true,
        message: 'Clocked in successfully',
        data: timeEntry,
      });
    } catch (error: any) {
      console.error('Clock in error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock in',
      });
    }
  }

  /**
   * Clock out
   * POST /api/time/clock-out
   */
  async clockOut(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notes } = req.body;

      const timeEntry = await timeService.clockOut(userId, notes);

      res.status(200).json({
        success: true,
        message: 'Clocked out successfully',
        data: timeEntry,
      });
    } catch (error: any) {
      console.error('Clock out error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to clock out',
      });
    }
  }

  /**
   * Get current active entry
   * GET /api/time/current
   */
  async getCurrentEntry(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const timeEntry = await timeService.getCurrentEntry(userId);

      res.status(200).json({
        success: true,
        data: timeEntry,
      });
    } catch (error: any) {
      console.error('Get current entry error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get current entry',
      });
    }
  }

  /**
   * Get user's time entries
   * GET /api/time/entries?startDate=...&endDate=...
   */
  async getUserTimeEntries(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const entries = await timeService.getUserTimeEntries(userId, start, end);

      res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error: any) {
      console.error('Get time entries error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get time entries',
      });
    }
  }

  /**
   * Get all time entries (admin only)
   * GET /api/time/entries/all?startDate=...&endDate=...
   */
  async getAllTimeEntries(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const entries = await timeService.getAllTimeEntries(start, end);

      res.status(200).json({
        success: true,
        data: entries,
      });
    } catch (error: any) {
      console.error('Get all time entries error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get time entries',
      });
    }
  }

  /**
   * Get user's time statistics
   * GET /api/time/stats?startDate=...&endDate=...
   */
  async getUserTimeStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const stats = await timeService.getUserTimeStats(userId, start, end);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get time stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get time stats',
      });
    }
  }

  /**
   * Approve time entry (admin/team leader only)
   * PUT /api/time/entries/:id/approve
   */
  async approveTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const approverId = req.user!.userId;

      const timeEntry = await timeService.approveTimeEntry(id, approverId);

      res.status(200).json({
        success: true,
        message: 'Time entry approved successfully',
        data: timeEntry,
      });
    } catch (error: any) {
      console.error('Approve time entry error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve time entry',
      });
    }
  }

  /**
   * Reject time entry (admin/team leader only)
   * PUT /api/time/entries/:id/reject
   */
  async rejectTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const approverId = req.user!.userId;

      const timeEntry = await timeService.rejectTimeEntry(id, approverId);

      res.status(200).json({
        success: true,
        message: 'Time entry rejected successfully',
        data: timeEntry,
      });
    } catch (error: any) {
      console.error('Reject time entry error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject time entry',
      });
    }
  }

  // ===== LEAVE REQUESTS =====

  /**
   * Create leave request
   * POST /api/time/leave
   */
  async createLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { leaveType, startDate, endDate, reason } = req.body;

      const leaveRequest = await timeService.createLeaveRequest(
        userId,
        leaveType as LeaveType,
        new Date(startDate),
        new Date(endDate),
        reason
      );

      // Send notification to team leaders and admins
      // Get user info for notification
      const user = await adminService.getUserById(userId);
      const employeeName = user ? `${user.first_name} ${user.last_name}` : 'Unknown';

      // Get all admins and team leaders to notify
      const userRepository = AppDataSource.getRepository(User);
      const managers = await userRepository.find({
        where: [
          { role: UserRole.ADMIN },
          { role: UserRole.TEAM_LEADER }
        ]
      });

      for (const manager of managers) {
        await notificationService.notifyNewLeaveRequest(
          manager.id,
          employeeName,
          leaveType as LeaveType,
          startDate,
          endDate,
          leaveRequest.id,
          userId
        );
      }

      res.status(201).json({
        success: true,
        message: 'Leave request created successfully',
        data: leaveRequest,
      });
    } catch (error: any) {
      console.error('Create leave request error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create leave request',
      });
    }
  }

  /**
   * Get user's leave requests
   * GET /api/time/leave
   */
  async getUserLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const requests = await timeService.getUserLeaveRequests(userId);

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      console.error('Get leave requests error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get leave requests',
      });
    }
  }

  /**
   * Get pending leave requests (admin/team leader only)
   * GET /api/time/leave/pending
   */
  async getPendingLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      const requests = await timeService.getPendingLeaveRequests();

      res.status(200).json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      console.error('Get pending leave requests error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get pending leave requests',
      });
    }
  }

  /**
   * Approve leave request (admin/team leader only)
   * PUT /api/time/leave/:id/approve
   */
  async approveLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reviewerId = req.user!.userId;
      const { notes } = req.body;

      const leaveRequest = await timeService.approveLeaveRequest(id, reviewerId, notes);

      // Send notification to user
      const startDate = leaveRequest.start_date instanceof Date
        ? leaveRequest.start_date.toISOString()
        : String(leaveRequest.start_date);
      const endDate = leaveRequest.end_date instanceof Date
        ? leaveRequest.end_date.toISOString()
        : String(leaveRequest.end_date);

      await notificationService.notifyLeaveRequestStatus(
        leaveRequest.user_id,
        'approved',
        leaveRequest.leave_type,
        startDate,
        endDate,
        leaveRequest.id
      );

      res.status(200).json({
        success: true,
        message: 'Leave request approved successfully',
        data: leaveRequest,
      });
    } catch (error: any) {
      console.error('Approve leave request error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to approve leave request',
      });
    }
  }

  /**
   * Reject leave request (admin/team leader only)
   * PUT /api/time/leave/:id/reject
   */
  async rejectLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const reviewerId = req.user!.userId;
      const { notes } = req.body;

      const leaveRequest = await timeService.rejectLeaveRequest(id, reviewerId, notes);

      // Send notification to user
      const startDate = leaveRequest.start_date instanceof Date
        ? leaveRequest.start_date.toISOString()
        : String(leaveRequest.start_date);
      const endDate = leaveRequest.end_date instanceof Date
        ? leaveRequest.end_date.toISOString()
        : String(leaveRequest.end_date);

      await notificationService.notifyLeaveRequestStatus(
        leaveRequest.user_id,
        'rejected',
        leaveRequest.leave_type,
        startDate,
        endDate,
        leaveRequest.id
      );

      res.status(200).json({
        success: true,
        message: 'Leave request rejected successfully',
        data: leaveRequest,
      });
    } catch (error: any) {
      console.error('Reject leave request error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject leave request',
      });
    }
  }

  /**
   * Cancel leave request
   * DELETE /api/time/leave/:id
   */
  async cancelLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const leaveRequest = await timeService.cancelLeaveRequest(id, userId);

      res.status(200).json({
        success: true,
        message: 'Leave request cancelled successfully',
        data: leaveRequest,
      });
    } catch (error: any) {
      console.error('Cancel leave request error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to cancel leave request',
      });
    }
  }

  /**
   * Get user's leave balance
   * GET /api/time/leave/balance?year=2025
   */
  async getUserLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

      const balance = await timeService.getUserLeaveBalance(userId, year);

      res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      console.error('Get leave balance error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get leave balance',
      });
    }
  }
}

export default new TimeController();
