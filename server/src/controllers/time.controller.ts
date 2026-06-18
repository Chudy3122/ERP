import { Request, Response } from 'express';
import { TimeService } from '../services/time.service';
import { LeaveType } from '../models/LeaveRequest.model';
import notificationService from '../services/notification.service';
import adminService from '../services/admin.service';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.model';

const timeService = new TimeService();

/** Classify the device from a browser User-Agent string (audit only). */
function detectDevice(ua?: string): 'mobile' | 'tablet' | 'desktop' | undefined {
  if (!ua) return undefined;
  // Tablets first: iPad, or Android without the "Mobile" token.
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Best-effort client IP behind the Render proxy. */
function clientIp(req: Request): string | undefined {
  const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || req.ip || req.socket?.remoteAddress || undefined;
}

export class TimeController {
  // ===== TIME ENTRIES =====

  /**
   * Clock in
   * POST /api/time/clock-in
   */
  async clockIn(req: Request, res: Response): Promise<void> {
    try {
      const { notes, expectedClockIn, clockInTime, userId: targetUserId } = req.body;
      // Only admin / kadry may set a manual (backdated) start time or clock in for
      // someone else. Regular employees always clock in at "now".
      const canManageTime = [UserRole.ADMIN, UserRole.KADRY].includes(req.user!.role as UserRole);
      const userId = canManageTime && targetUserId ? targetUserId : req.user!.userId;
      const effClockInTime = canManageTime ? clockInTime : undefined;

      // Record the device/IP only when a user clocks in for THEMSELVES, so the
      // badge reflects the employee's actual device (not a manager acting for them).
      const isSelf = userId === req.user!.userId;
      const device = isSelf ? detectDevice(req.headers['user-agent']) : undefined;
      const ip = isSelf ? clientIp(req) : undefined;

      const timeEntry = await timeService.clockIn(userId, notes, expectedClockIn, effClockInTime, device, ip);

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
   * Clock out (legacy)
   * POST /api/time/clock-out
   */
  async clockOut(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notes } = req.body;
      const timeEntry = await timeService.clockOut(userId, notes);
      res.status(200).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to clock out' });
    }
  }

  /**
   * Get today's day status
   * GET /api/time/day-status
   */
  async getDayStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const status = await timeService.getDayStatus(userId);
      res.status(200).json({ success: true, data: status });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Failed to get day status' });
    }
  }

  /**
   * Pause work
   * POST /api/time/pause
   */
  async pauseWork(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notes } = req.body;
      const timeEntry = await timeService.pauseWork(userId, notes);
      res.status(200).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to pause work' });
    }
  }

  /**
   * End work for the day
   * POST /api/time/end-work
   */
  async endWork(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { notes } = req.body;
      const device = detectDevice(req.headers['user-agent']);
      const ip = clientIp(req);
      const timeEntry = await timeService.endWork(userId, notes, device, ip);
      res.status(200).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to end work' });
    }
  }

  /**
   * Add a manual time entry
   * POST /api/time/manual-entry
   */
  async addManualEntry(req: Request, res: Response): Promise<void> {
    try {
      const { date, clockIn, clockOut, notes, clock_in, clock_out, userId: targetUserId } = req.body;
      // Restricted to admin/kadry (route guard); they may log for any employee
      const userId = targetUserId || req.user!.userId;

      if (!date || !clockIn || !clockOut) {
        res.status(400).json({ success: false, message: 'Wymagane pola: date, clockIn, clockOut' });
        return;
      }

      const timeEntry = await timeService.addManualEntry(userId, { date, clockIn, clockOut, notes, clock_in, clock_out });
      res.status(201).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to add manual entry' });
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
   * Get all time entries (admin = all, kierownik = own dept only)
   * GET /api/time/entries/all?startDate=...&endDate=...
   */
  async getAllTimeEntries(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      let entries = await timeService.getAllTimeEntries(start, end);

      if (req.user!.role === UserRole.KIEROWNIK) {
        const userRepo = AppDataSource.getRepository(User);
        const manager = await userRepo.findOne({ where: { id: req.user!.userId }, select: ['id', 'department_id'] });
        if (manager?.department_id) {
          const deptUsers = await userRepo.find({ where: { department_id: manager.department_id, is_active: true }, select: ['id'] });
          const deptUserIds = new Set(deptUsers.map((u) => u.id));
          entries = entries.filter((e) => deptUserIds.has((e as any).user_id || (e as any).userId));
        } else {
          entries = [];
        }
      }

      res.status(200).json({ success: true, data: entries });
    } catch (error: any) {
      console.error('Get all time entries error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get time entries' });
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
   * Update time entry notes (owner only)
   * PUT /api/time/entries/:id/notes
   */
  async updateEntryNotes(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user!.userId;
      const timeEntry = await timeService.updateEntryNotes(id, userId, notes ?? '');
      res.status(200).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to update notes' });
    }
  }

  /**
   * Edit a time entry (admin only)
   * PUT /api/time/entries/:id
   */
  async updateTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { clock_in, clock_out, notes } = req.body;
      // Editing hours is restricted to admin / kadry (regular users must not change times)
      const canManageTime = [UserRole.ADMIN, UserRole.KADRY].includes(req.user!.role as UserRole);
      if (!canManageTime) {
        res.status(403).json({ success: false, message: 'Tylko administrator lub kadry mogą edytować godziny pracy' });
        return;
      }
      const timeEntry = await timeService.updateTimeEntry(id, { clock_in, clock_out, notes });
      res.status(200).json({ success: true, data: timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to update time entry' });
    }
  }

  /**
   * Delete a time entry (admin only)
   * DELETE /api/time/entries/:id
   */
  async deleteTimeEntry(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // Deleting time entries is restricted to admin / kadry
      const canManageTime = [UserRole.ADMIN, UserRole.KADRY].includes(req.user!.role as UserRole);
      if (!canManageTime) {
        res.status(403).json({ success: false, message: 'Tylko administrator lub kadry mogą usuwać wpisy czasu pracy' });
        return;
      }
      await timeService.deleteTimeEntry(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete time entry' });
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
      const { leaveType, startDate, endDate, reason, userId: targetUserId } = req.body;
      // Admin / kadry may file an absence on behalf of another employee
      const canCreateForOthers = [UserRole.ADMIN, UserRole.KADRY].includes(req.user!.role as UserRole);
      const userId = canCreateForOthers && targetUserId ? targetUserId : req.user!.userId;

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

      // Notify: all admins + all księgowość; kierownik only for their own department
      const userRepository = AppDataSource.getRepository(User);
      const applicantDeptId = (user as any)?.department_id || null;
      const where: any[] = [
        { role: UserRole.ADMIN },
        { role: UserRole.KADRY },
      ];
      if (applicantDeptId) {
        where.push({ role: UserRole.KIEROWNIK, department_id: applicantDeptId });
      }
      const managers = await userRepository.find({ where });

      for (const manager of managers) {
        if (manager.id === userId) continue; // don't notify the applicant about their own request
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
   * Get comments for a leave request
   * GET /api/time/leave/:id/comments
   */
  async getLeaveComments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const comments = await timeService.getLeaveComments(id);
      res.status(200).json({ success: true, data: comments });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to get comments' });
    }
  }

  /**
   * Add a comment to a leave request (owner or manager)
   * POST /api/time/leave/:id/comments
   */
  async addLeaveComment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const comment = await timeService.addLeaveComment(id, req.user!.userId, content);
      res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to add comment' });
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
   * Get pending leave requests (admin = all, kierownik = own dept only)
   * GET /api/time/leave/pending
   */
  async getPendingLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      let requests = await timeService.getPendingLeaveRequests();

      if (req.user!.role === UserRole.KIEROWNIK) {
        const userRepo = AppDataSource.getRepository(User);
        const manager = await userRepo.findOne({ where: { id: req.user!.userId }, select: ['id', 'department_id'] });
        if (manager?.department_id) {
          const deptUsers = await userRepo.find({ where: { department_id: manager.department_id, is_active: true }, select: ['id'] });
          const deptUserIds = new Set(deptUsers.map((u) => u.id));
          requests = requests.filter((r) => deptUserIds.has(r.user_id));
        } else {
          requests = [];
        }
      }

      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      console.error('Get pending leave requests error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get pending leave requests' });
    }
  }

  /**
   * Get all manageable leave requests (pending + reviewed) for managers
   * GET /api/time/leave/manageable
   */
  async getManageableLeaveRequests(req: Request, res: Response): Promise<void> {
    try {
      let requests = await timeService.getManageableLeaveRequests();

      if (req.user!.role === UserRole.KIEROWNIK) {
        const userRepo = AppDataSource.getRepository(User);
        const manager = await userRepo.findOne({ where: { id: req.user!.userId }, select: ['id', 'department_id'] });
        if (manager?.department_id) {
          const deptUsers = await userRepo.find({ where: { department_id: manager.department_id, is_active: true }, select: ['id'] });
          const deptUserIds = new Set(deptUsers.map((u) => u.id));
          requests = requests.filter((r) => deptUserIds.has(r.user_id));
        } else {
          requests = [];
        }
      }

      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      console.error('Get manageable leave requests error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get manageable leave requests' });
    }
  }

  /**
   * All leave requests for all users (admin / kadry)
   * GET /api/time/leave/all
   */
  async getAllLeaveRequests(_req: Request, res: Response): Promise<void> {
    try {
      const requests = await timeService.getAllLeaveRequests();
      res.status(200).json({ success: true, data: requests });
    } catch (error: any) {
      console.error('Get all leave requests error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get all leave requests' });
    }
  }

  /**
   * Monthly evidence report for one employee (admin / kadry)
   * GET /api/time/report/monthly?userId=&year=&month=
   */
  async getMonthlyReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1);
      if (!userId) { res.status(400).json({ success: false, message: 'userId jest wymagany' }); return; }
      const data = await timeService.getMonthlyReport(userId, year, month);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Get monthly report error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get report' });
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

      if (req.user!.role === UserRole.KIEROWNIK) {
        const userRepo = AppDataSource.getRepository(User);
        const lr = await timeService.getPendingLeaveRequests();
        const target = lr.find((r) => r.id === id);
        if (!target) {
          res.status(404).json({ success: false, message: 'Wniosek nie znaleziony' });
          return;
        }
        const manager = await userRepo.findOne({ where: { id: reviewerId }, select: ['id', 'department_id'] });
        const targetUser = await userRepo.findOne({ where: { id: target.user_id }, select: ['id', 'department_id'] });
        if (!manager?.department_id || manager.department_id !== targetUser?.department_id) {
          res.status(403).json({ success: false, message: 'Możesz zatwierdzać tylko wnioski pracowników ze swojego działu' });
          return;
        }
      }

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

      if (req.user!.role === UserRole.KIEROWNIK) {
        const userRepo = AppDataSource.getRepository(User);
        const lr = await timeService.getPendingLeaveRequests();
        const target = lr.find((r) => r.id === id);
        if (!target) {
          res.status(404).json({ success: false, message: 'Wniosek nie znaleziony' });
          return;
        }
        const manager = await userRepo.findOne({ where: { id: reviewerId }, select: ['id', 'department_id'] });
        const targetUser = await userRepo.findOne({ where: { id: target.user_id }, select: ['id', 'department_id'] });
        if (!manager?.department_id || manager.department_id !== targetUser?.department_id) {
          res.status(403).json({ success: false, message: 'Możesz odrzucać tylko wnioski pracowników ze swojego działu' });
          return;
        }
      }

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
   * Revert a reviewed leave request back to pending (managers only)
   * PUT /api/time/leave/:id/revert
   */
  async revertLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leaveRequest = await timeService.revertLeaveRequest(id);
      res.status(200).json({ success: true, data: leaveRequest });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to revert leave request' });
    }
  }

  /**
   * Force-cancel any leave request (managers only)
   * PUT /api/time/leave/:id/cancel
   */
  async adminCancelLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const leaveRequest = await timeService.forceCancelLeaveRequest(id);
      res.status(200).json({ success: true, data: leaveRequest });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to cancel leave request' });
    }
  }

  /**
   * Permanently delete a leave request (admin only)
   * DELETE /api/time/leave/:id/hard
   */
  async deleteLeaveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await timeService.deleteLeaveRequest(id);
      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Failed to delete leave request' });
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

  /**
   * Leave plan overview for all users (admin/kadry)
   * GET /api/time/leave/overview?year=2026
   */
  async getLeaveOverview(req: Request, res: Response): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const data = await timeService.getLeaveOverview(year);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Get leave overview error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get leave overview' });
    }
  }

  /**
   * Update a user's leave allocation (admin/kadry)
   * PUT /api/time/leave/allocation/:userId
   */
  async updateLeaveAllocation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        annualLeaveDays, carriedOverDays, usedLeaveDays,
        remoteWorkDays, usedRemoteDays, employmentFraction, workingHoursPerDay,
      } = req.body;
      const numOrUndef = (v: any) => (v !== undefined && v !== null && v !== '' ? Number(v) : undefined);
      const user = await timeService.updateLeaveAllocation(userId, {
        annualLeaveDays: numOrUndef(annualLeaveDays),
        carriedOverDays: numOrUndef(carriedOverDays),
        usedLeaveDays: numOrUndef(usedLeaveDays),
        remoteWorkDays: numOrUndef(remoteWorkDays),
        usedRemoteDays: numOrUndef(usedRemoteDays),
        employmentFraction: employmentFraction !== undefined ? employmentFraction : undefined,
        workingHoursPerDay: numOrUndef(workingHoursPerDay),
      });
      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          annualLeave: user.annual_leave_days,
          carriedOver: user.carried_over_days,
          usedLeave: user.used_leave_days,
          remoteWork: user.remote_work_days,
          usedRemote: user.used_remote_days,
          employmentFraction: user.employment_fraction,
          workingHoursPerDay: user.working_hours_per_day,
        },
      });
    } catch (error: any) {
      console.error('Update leave allocation error:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to update leave allocation' });
    }
  }

  /**
   * Get attendance overview
   * GET /api/time/attendance?days=7
   */
  async getAttendance(req: Request, res: Response): Promise<void> {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const data = await timeService.getAttendance(days, startDate, endDate);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Get attendance error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get attendance' });
    }
  }
}

export default new TimeController();
