import { Between, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TimeEntry, TimeEntryStatus } from '../models/TimeEntry.model';
import { LeaveRequest, LeaveStatus, LeaveType, DEDUCTING_LEAVE_TYPES } from '../models/LeaveRequest.model';
import { LeaveRequestComment } from '../models/LeaveRequestComment.model';
import { User } from '../models/User.model';

function roundToNearest15Min(date: Date): Date {
  const ms15 = 15 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms15) * ms15);
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export type DayState = 'not_started' | 'working' | 'paused' | 'ended';

export class TimeService {
  private timeEntryRepository: Repository<TimeEntry>;
  private leaveRequestRepository: Repository<LeaveRequest>;
  private leaveCommentRepository: Repository<LeaveRequestComment>;
  private userRepository: Repository<User>;

  constructor() {
    this.timeEntryRepository = AppDataSource.getRepository(TimeEntry);
    this.leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);
    this.leaveCommentRepository = AppDataSource.getRepository(LeaveRequestComment);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // ===== LEAVE REQUEST COMMENTS =====

  /** List comments for a leave request (oldest first) */
  async getLeaveComments(leaveRequestId: string): Promise<LeaveRequestComment[]> {
    return this.leaveCommentRepository.find({
      where: { leave_request_id: leaveRequestId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Add a comment. Allowed for the request owner or a manager
   * (admin/kierownik/ksiegowosc/szef). Returns the saved comment with user.
   */
  async addLeaveComment(leaveRequestId: string, userId: string, content: string): Promise<LeaveRequestComment> {
    const trimmed = (content || '').trim();
    if (!trimmed) throw new Error('Komentarz nie może być pusty');

    const request = await this.leaveRequestRepository.findOne({ where: { id: leaveRequestId } });
    if (!request) throw new Error('Wniosek nie znaleziony');

    const author = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'role'] });
    const managerRoles = ['admin', 'kierownik', 'ksiegowosc', 'szef'];
    const isOwner = request.user_id === userId;
    const isManager = author ? managerRoles.includes(author.role) : false;
    if (!isOwner && !isManager) {
      throw new Error('Brak uprawnień do komentowania tego wniosku');
    }

    const comment = this.leaveCommentRepository.create({
      leave_request_id: leaveRequestId,
      user_id: userId,
      content: trimmed,
    });
    const saved = await this.leaveCommentRepository.save(comment);
    return (await this.leaveCommentRepository.findOne({ where: { id: saved.id }, relations: ['user'] }))!;
  }

  // ===== TIME ENTRIES =====

  /**
   * Get today's work state for a user
   */
  async getDayStatus(userId: string): Promise<{
    state: DayState;
    currentEntry: TimeEntry | null;
    todayEntries: TimeEntry[];
    totalWorkedMinutesToday: number;
  }> {
    const { start, end } = todayRange();

    const currentEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
      relations: ['user'],
    });

    const todayEntries = await this.timeEntryRepository.find({
      where: { user_id: userId, clock_in: Between(start, end) },
      order: { clock_in: 'DESC' },
    });

    let state: DayState;
    if (currentEntry) {
      state = 'working';
    } else if (todayEntries.length > 0) {
      state = todayEntries[0].is_break ? 'paused' : 'ended';
    } else {
      state = 'not_started';
    }

    const totalWorkedMinutesToday = todayEntries
      .filter((e) => e.status !== TimeEntryStatus.IN_PROGRESS)
      .reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

    return { state, currentEntry, todayEntries, totalWorkedMinutesToday };
  }

  /**
   * Clock in - Start work (first clock-in of the day gets 15-min rounding bonus)
   */
  async clockIn(userId: string, notes?: string, expectedClockIn?: string): Promise<TimeEntry> {
    const existingEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (existingEntry) {
      throw new Error('Masz już aktywny wpis czasu pracy. Najpierw zakończ lub zapauzuj pracę.');
    }

    const { start, end } = todayRange();
    const todayCount = await this.timeEntryRepository.count({
      where: { user_id: userId, clock_in: Between(start, end) },
    });

    // Only the first clock-in of the day gets the 15-minute floor rounding
    const clockInTime = todayCount === 0 ? roundToNearest15Min(new Date()) : new Date();

    const timeEntry = this.timeEntryRepository.create({
      user_id: userId,
      clock_in: clockInTime,
      notes,
      expected_clock_in: expectedClockIn || '09:00:00',
      status: TimeEntryStatus.IN_PROGRESS,
      is_break: false,
      is_manual: false,
    });

    const lateMinutes = timeEntry.calculateLateArrival();
    timeEntry.is_late = lateMinutes > 0;
    timeEntry.late_minutes = lateMinutes;

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Pause work — clock out with exact time (no rounding — avoids negative durations)
   */
  async pauseWork(userId: string, notes?: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (!timeEntry) {
      throw new Error('Brak aktywnej sesji pracy do zapauzowania');
    }

    timeEntry.clockOut(notes || 'Pauza w pracy', new Date());
    timeEntry.is_break = true;
    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * End work for the day — clock-out rounded to nearest 15 min (same as clock-in);
   * if paused, just mark day as ended (no time to adjust)
   */
  async endWork(userId: string, notes?: string): Promise<TimeEntry> {
    const activeEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (activeEntry) {
      const now = new Date();
      const rounded = roundToNearest15Min(now);
      // Safety: never let rounded clock_out be before clock_in (would give negative duration)
      const clockOutTime = rounded.getTime() > activeEntry.clock_in.getTime() ? rounded : now;
      activeEntry.clockOut(notes || 'Zakończenie pracy', clockOutTime);
      activeEntry.is_break = false;
      return await this.timeEntryRepository.save(activeEntry);
    }

    // If paused → flip last break entry's is_break to false (day officially ended)
    const { start, end } = todayRange();
    const lastEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, clock_in: Between(start, end) },
      order: { clock_in: 'DESC' },
    });

    if (!lastEntry) {
      throw new Error('Brak wpisów z dzisiaj');
    }

    if (!lastEntry.is_break) {
      throw new Error('Praca jest już zakończona na dziś');
    }

    lastEntry.is_break = false;
    return await this.timeEntryRepository.save(lastEntry);
  }

  /**
   * Add a manual time entry (completed, no rounding)
   */
  async addManualEntry(
    userId: string,
    data: {
      date: string; // YYYY-MM-DD
      clockIn: string; // HH:MM
      clockOut: string; // HH:MM
      notes?: string;
    }
  ): Promise<TimeEntry> {
    const [inH, inM] = data.clockIn.split(':').map(Number);
    const [outH, outM] = data.clockOut.split(':').map(Number);
    const [y, mo, d] = data.date.split('-').map(Number);

    const clockInDate = new Date(y, mo - 1, d, inH, inM, 0, 0);
    const clockOutDate = new Date(y, mo - 1, d, outH, outM, 0, 0);

    if (clockOutDate <= clockInDate) {
      throw new Error('Czas zakończenia musi być po czasie rozpoczęcia');
    }

    const timeEntry = this.timeEntryRepository.create({
      user_id: userId,
      clock_in: clockInDate,
      clock_out: clockOutDate,
      notes: data.notes,
      expected_clock_in: '09:00:00',
      status: TimeEntryStatus.COMPLETED,
      is_break: false,
      is_manual: true,
    });

    timeEntry.duration_minutes = timeEntry.calculateDuration();
    timeEntry.overtime_minutes = timeEntry.calculateOvertime();
    timeEntry.is_overtime = timeEntry.overtime_minutes > 0;
    timeEntry.is_late = false;
    timeEntry.late_minutes = 0;

    return await this.timeEntryRepository.save(timeEntry);
  }

  /**
   * Auto clock-out all entries that have been running for 8+ hours
   */
  async autoClockOutStale(): Promise<number> {
    const userRepository = AppDataSource.getRepository(User);

    const activeEntries = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.status = :status', { status: TimeEntryStatus.IN_PROGRESS })
      .getMany();

    let stopped = 0;
    const now = Date.now();

    for (const entry of activeEntries) {
      const user = await userRepository.findOne({
        where: { id: entry.user_id },
        select: ['id', 'working_hours_per_day'],
      });

      const maxHours = Number(user?.working_hours_per_day) || 8;
      const maxMs = maxHours * 60 * 60 * 1000;

      if (now >= entry.clock_in.getTime() + maxMs) {
        const autoClockOut = new Date(entry.clock_in.getTime() + maxMs);
        entry.clockOut(`Auto-zakończono po ${maxHours}h pracy`, autoClockOut);
        await this.timeEntryRepository.save(entry);
        stopped++;
      }
    }

    if (stopped > 0) {
      console.log(`[AutoClockOut] Zakończono ${stopped} sesji na podstawie etatu użytkownika`);
    }

    return stopped;
  }

  /**
   * Clock out - End current time entry (legacy, kept for backward compatibility)
   */
  async clockOut(userId: string, notes?: string): Promise<TimeEntry> {
    const timeEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (!timeEntry) {
      throw new Error('Brak aktywnej sesji pracy');
    }

    timeEntry.clockOut(notes, new Date());
    timeEntry.is_break = false;
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
   * Update the notes/description on a time entry (owner only)
   */
  async updateEntryNotes(entryId: string, userId: string, notes: string): Promise<TimeEntry> {
    const entry = await this.timeEntryRepository.findOne({ where: { id: entryId } });
    if (!entry) throw new Error('Wpis nie istnieje');
    if (entry.user_id !== userId) throw new Error('Brak uprawnień do edycji tego wpisu');
    entry.notes = notes || null;
    return await this.timeEntryRepository.save(entry);
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

  /**
   * Get attendance overview for all users.
   */
  async getAttendance(days: number = 7, rangeStart?: Date, rangeEnd?: Date) {
    const endDate = rangeEnd ? new Date(rangeEnd) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = rangeStart ? new Date(rangeStart) : new Date();
    if (!rangeStart) {
      startDate.setDate(startDate.getDate() - (days - 1));
    }
    startDate.setHours(0, 0, 0, 0);

    const users = await this.userRepository.find({
      where: { is_active: true },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });

    const entries = await this.timeEntryRepository.find({
      where: { clock_in: Between(startDate, endDate) },
      order: { clock_in: 'ASC' },
    });

    const dates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(getLocalDateKey(d));
    }

    const result = users.map((user) => {
      const userEntries = entries.filter((e) => e.user_id === user.id);
      const daysData = dates.map((date) => {
        const entry = userEntries.find((e) => getLocalDateKey(e.clock_in) === date);
        return {
          date,
          clock_in: entry?.clock_in ?? null,
          clock_out: entry?.clock_out ?? null,
          duration_minutes: entry?.duration_minutes ?? null,
          status: entry?.status ?? null,
        };
      });
      return { id: user.id, first_name: user.first_name, last_name: user.last_name, avatar_url: user.avatar_url, days: daysData };
    });

    return { users: result, dates };
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
   * Get all manageable leave requests (pending + reviewed, excludes cancelled)
   */
  async getManageableLeaveRequests(): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.find({
      where: [
        { status: LeaveStatus.PENDING },
        { status: LeaveStatus.APPROVED },
        { status: LeaveStatus.REJECTED },
      ],
      relations: ['user'],
      order: { created_at: 'DESC' },
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
   * Revert a reviewed (approved/rejected) request back to pending (manager action)
   */
  async revertLeaveRequest(requestId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({ where: { id: requestId } });
    if (!request) throw new Error('Wniosek nie znaleziony');
    request.status = LeaveStatus.PENDING;
    request.reviewed_by = null;
    request.reviewed_at = null;
    request.review_notes = null;
    return await this.leaveRequestRepository.save(request);
  }

  /**
   * Force-cancel any leave request regardless of owner (manager action)
   */
  async forceCancelLeaveRequest(requestId: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({ where: { id: requestId } });
    if (!request) throw new Error('Wniosek nie znaleziony');
    request.status = LeaveStatus.CANCELLED;
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

    // Only vacation + on-demand leave deducts from the annual pool
    const usedDays = approvedRequests
      .filter((req) => DEDUCTING_LEAVE_TYPES.includes(req.leave_type))
      .reduce((sum, req) => sum + req.total_days, 0);

    // Pull the annual allowance from the user's configured value
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const annualLeave = user?.annual_leave_days ?? 20;
    const remaining = annualLeave - usedDays;

    return {
      annualLeave,
      usedDays,
      remaining: Math.max(0, remaining),
      year,
    };
  }
}
