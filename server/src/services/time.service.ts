import { Between, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TimeEntry, TimeEntryStatus } from '../models/TimeEntry.model';
import { LeaveRequest, LeaveStatus, LeaveType } from '../models/LeaveRequest.model';
import { User } from '../models/User.model';

export class TimeService {
  private timeEntryRepository: Repository<TimeEntry>;
  private leaveRequestRepository: Repository<LeaveRequest>;
  private userRepository: Repository<User>;

  constructor() {
    this.timeEntryRepository = AppDataSource.getRepository(TimeEntry);
    this.leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // ===== TIME ENTRIES =====

  /**
   * Clock in - Start a new time entry
   */
  async clockIn(userId: string, notes?: string): Promise<TimeEntry> {
    // Check if user already has an in-progress entry
    const existingEntry = await this.timeEntryRepository.findOne({
      where: {
        user_id: userId,
        status: TimeEntryStatus.IN_PROGRESS,
      },
    });

    if (existingEntry) {
      throw new Error('You already have an active time entry. Please clock out first.');
    }

    const timeEntry = this.timeEntryRepository.create({
      user_id: userId,
      clock_in: new Date(),
      notes,
      status: TimeEntryStatus.IN_PROGRESS,
    });

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Clock out - End current time entry
   */
  async clockOut(userId: string, notes?: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: {
        user_id: userId,
        status: TimeEntryStatus.IN_PROGRESS,
      },
    });

    if (!timeEntry) {
      throw new Error('No active time entry found');
    }

    timeEntry.clockOut(notes);
    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Get current active time entry for user
   */
  async getCurrentEntry(userId: string): Promise<TimeEntry | null> {
    return await this.timeEntryRepository.findOne({
      where: {
        user_id: userId,
        status: TimeEntryStatus.IN_PROGRESS,
      },
      relations: ['user'],
    });
  }

  /**
   * Get time entries for a user within date range
   */
  async getUserTimeEntries(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeEntry[]> {
    return await this.timeEntryRepository.find({
      where: {
        user_id: userId,
        clock_in: Between(startDate, endDate),
      },
      relations: ['user', 'approver'],
      order: { clock_in: 'DESC' },
    });
  }

  /**
   * Get all time entries (admin only)
   */
  async getAllTimeEntries(startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    return await this.timeEntryRepository.find({
      where: {
        clock_in: Between(startDate, endDate),
      },
      relations: ['user', 'approver'],
      order: { clock_in: 'DESC' },
    });
  }

  /**
   * Approve time entry
   */
  async approveTimeEntry(entryId: string, approverId: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: entryId },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    if (timeEntry.status !== TimeEntryStatus.COMPLETED) {
      throw new Error('Only completed time entries can be approved');
    }

    timeEntry.approve(approverId);
    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Reject time entry
   */
  async rejectTimeEntry(entryId: string, approverId: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { id: entryId },
    });

    if (!timeEntry) {
      throw new Error('Time entry not found');
    }

    timeEntry.reject(approverId);
    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Get time statistics for user
   */
  async getUserTimeStats(userId: string, startDate: Date, endDate: Date) {
    const entries = await this.getUserTimeEntries(userId, startDate, endDate);

    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
    const overtimeMinutes = entries.reduce((sum, entry) => sum + entry.overtime_minutes, 0);
    const daysWorked = new Set(entries.map((e) => e.clock_in.toDateString())).size;

    return {
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
      overtimeHours: Math.floor(overtimeMinutes / 60),
      overtimeMinutes: overtimeMinutes % 60,
      daysWorked,
      entriesCount: entries.length,
      averageHoursPerDay: daysWorked > 0 ? totalMinutes / 60 / daysWorked : 0,
    };
  }

  // ===== LEAVE REQUESTS =====

  /**
   * Create a new leave request
   */
  async createLeaveRequest(
    userId: string,
    leaveType: LeaveType,
    startDate: Date,
    endDate: Date,
    reason?: string
  ): Promise<LeaveRequest> {
    // Validate dates
    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }

    // Check for overlapping requests
    const overlappingRequests = await this.leaveRequestRepository.find({
      where: {
        user_id: userId,
        status: LeaveStatus.APPROVED,
      },
    });

    const newRequest = this.leaveRequestRepository.create({
      user_id: userId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      total_days: 0,
      reason,
    });
    newRequest.total_days = newRequest.calculateTotalDays();

    // Check for overlaps
    for (const existing of overlappingRequests) {
      if (newRequest.isOverlapping(existing)) {
        throw new Error(
          `Leave request overlaps with existing approved request from ${existing.start_date} to ${existing.end_date}`
        );
      }
    }

    return await this.leaveRequestRepository.save(newRequest);
  }

  /**
   * Get leave requests for a user
   */
  async getUserLeaveRequests(userId: string): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.find({
      where: { user_id: userId },
      relations: ['user', 'reviewer'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get all pending leave requests (admin/team leader)
   */
  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.find({
      where: { status: LeaveStatus.PENDING },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Approve leave request
   */
  async approveLeaveRequest(
    requestId: string,
    reviewerId: string,
    notes?: string
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending leave requests can be approved');
    }

    request.approve(reviewerId, notes);
    return await this.leaveRequestRepository.save(request);
  }

  /**
   * Reject leave request
   */
  async rejectLeaveRequest(
    requestId: string,
    reviewerId: string,
    notes?: string
  ): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Leave request not found');
    }

    if (request.status !== LeaveStatus.PENDING) {
      throw new Error('Only pending leave requests can be rejected');
    }

    request.reject(reviewerId, notes);
    return await this.leaveRequestRepository.save(request);
  }

  /**
   * Cancel leave request
   */
  async cancelLeaveRequest(requestId: string, userId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { id: requestId, user_id: userId },
    });

    if (!request) {
      throw new Error('Leave request not found');
    }

    request.cancel();
    return await this.leaveRequestRepository.save(request);
  }

  /**
   * Get leave balance for user (simplified - assumes fixed annual leave)
   */
  async getUserLeaveBalance(userId: string, year: number = new Date().getFullYear()) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const approvedRequests = await this.leaveRequestRepository.find({
      where: {
        user_id: userId,
        status: LeaveStatus.APPROVED,
        start_date: Between(startDate, endDate),
      },
    });

    const usedDays = approvedRequests.reduce((sum, req) => sum + req.total_days, 0);
    const annualLeave = 20; // Default 20 days per year
    const remaining = annualLeave - usedDays;

    return {
      annualLeave,
      usedDays,
      remaining: Math.max(0, remaining),
      year,
    };
  }
}
