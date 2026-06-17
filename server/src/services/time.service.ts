import { Between, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { TimeEntry, TimeEntryStatus } from '../models/TimeEntry.model';
import { LeaveRequest, LeaveStatus, LeaveType, DEDUCTING_LEAVE_TYPES } from '../models/LeaveRequest.model';
import { WorkLog, WorkLogType } from '../models/WorkLog.model';
import { LeaveRequestComment } from '../models/LeaveRequestComment.model';
import { User } from '../models/User.model';

/** Parse an etat fraction like "1", "7/8", "3/4" → numeric (1, 0.875, 0.75). */
function parseEmploymentFraction(s: string | null | undefined): number | null {
  if (!s) return null;
  const t = s.trim();
  if (t.includes('/')) {
    const [a, b] = t.split('/').map((x) => Number(x));
    return b ? a / b : null;
  }
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function roundToNearest5Min(date: Date): Date {
  const ms5 = 5 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms5) * ms5);
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
    const managerRoles = ['admin', 'kierownik', 'kadry', 'szef'];
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
   * Clock in - Start work (first clock-in of the day gets 5-min rounding bonus)
   */
  async clockIn(
    userId: string,
    notes?: string,
    expectedClockIn?: string,
    backdatedStart?: string,
    device?: string,
    ip?: string,
  ): Promise<TimeEntry> {
    const existingEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (existingEntry) {
      throw new Error('Masz już aktywny wpis czasu pracy. Najpierw zakończ lub zapauzuj pracę.');
    }

    let clockInTime: Date;
    let isManual = false;
    if (backdatedStart) {
      // Manual start: timer runs live from the given (past) time
      const t = new Date(backdatedStart);
      if (isNaN(t.getTime())) throw new Error('Nieprawidłowa godzina rozpoczęcia');
      if (t.getTime() > Date.now()) throw new Error('Godzina rozpoczęcia nie może być w przyszłości');
      clockInTime = t;
      isManual = true;
    } else {
      const { start, end } = todayRange();
      const todayCount = await this.timeEntryRepository.count({
        where: { user_id: userId, clock_in: Between(start, end) },
      });
      // Only the first clock-in of the day gets the 5-minute floor rounding
      clockInTime = todayCount === 0 ? roundToNearest5Min(new Date()) : new Date();
    }

    const timeEntry = this.timeEntryRepository.create({
      user_id: userId,
      clock_in: clockInTime,
      notes,
      expected_clock_in: expectedClockIn || '09:00:00',
      status: TimeEntryStatus.IN_PROGRESS,
      is_break: false,
      is_manual: isManual,
      clock_in_device: device || null,
      clock_in_ip: ip || null,
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
   * End work for the day — clock-out rounded to nearest 5 min (same as clock-in);
   * if paused, just mark day as ended (no time to adjust)
   */
  async endWork(userId: string, notes?: string): Promise<TimeEntry> {
    const activeEntry = await this.timeEntryRepository.findOne({
      where: { user_id: userId, status: TimeEntryStatus.IN_PROGRESS },
    });

    if (activeEntry) {
      const now = new Date();
      const rounded = roundToNearest5Min(now);
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
      clock_in?: string; // ISO, built in the user's tz (preferred)
      clock_out?: string; // ISO
    }
  ): Promise<TimeEntry> {
    // Prefer ISO timestamps from the client (correct timezone). Fall back to
    // constructing from date + HH:MM (interprets in server tz — legacy).
    let clockInDate: Date;
    let clockOutDate: Date;
    if (data.clock_in && data.clock_out) {
      clockInDate = new Date(data.clock_in);
      clockOutDate = new Date(data.clock_out);
    } else {
      const [inH, inM] = data.clockIn.split(':').map(Number);
      const [outH, outM] = data.clockOut.split(':').map(Number);
      const [y, mo, d] = data.date.split('-').map(Number);
      clockInDate = new Date(y, mo - 1, d, inH, inM, 0, 0);
      clockOutDate = new Date(y, mo - 1, d, outH, outM, 0, 0);
    }

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

    // Round clock-out down to the nearest 5 min (same as endWork); never before clock-in
    const now = new Date();
    const rounded = roundToNearest5Min(now);
    const clockOutTime = rounded.getTime() > timeEntry.clock_in.getTime() ? rounded : now;
    timeEntry.clockOut(notes, clockOutTime);
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
   * Admin: edit a time entry's clock-in / clock-out / notes (recomputes duration).
   */
  async updateTimeEntry(
    entryId: string,
    data: { clock_in?: string; clock_out?: string | null; notes?: string },
    requester?: { id: string; isAdmin: boolean },
  ): Promise<TimeEntry> {
    const entry = await this.timeEntryRepository.findOne({ where: { id: entryId } });
    if (!entry) throw new Error('Wpis nie istnieje');
    if (requester && !requester.isAdmin && entry.user_id !== requester.id) {
      throw new Error('Brak uprawnień do edycji tego wpisu');
    }

    if (data.clock_in !== undefined) entry.clock_in = new Date(data.clock_in);
    if (data.clock_out !== undefined) entry.clock_out = data.clock_out ? new Date(data.clock_out) : null;
    if (data.notes !== undefined) entry.notes = data.notes || null;

    if (entry.clock_out) {
      if (entry.clock_out.getTime() < entry.clock_in.getTime()) {
        throw new Error('Godzina zakończenia nie może być wcześniejsza niż rozpoczęcia');
      }
      entry.duration_minutes = Math.round((entry.clock_out.getTime() - entry.clock_in.getTime()) / 60000);
      if (entry.status === TimeEntryStatus.IN_PROGRESS) entry.status = TimeEntryStatus.COMPLETED;
    } else {
      entry.duration_minutes = null;
    }

    return await this.timeEntryRepository.save(entry);
  }

  /**
   * Admin: permanently delete a time entry.
   */
  async deleteTimeEntry(entryId: string, requester?: { id: string; isAdmin: boolean }): Promise<void> {
    const entry = await this.timeEntryRepository.findOne({ where: { id: entryId } });
    if (!entry) throw new Error('Wpis nie istnieje');
    if (requester && !requester.isAdmin && entry.user_id !== requester.id) {
      throw new Error('Brak uprawnień do usunięcia tego wpisu');
    }
    await this.timeEntryRepository.delete({ id: entryId });
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
      relations: ['user', 'reviewer'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Every leave request for every user, all statuses (admin / kadry view).
   */
  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return await this.leaveRequestRepository.find({
      relations: ['user', 'reviewer'],
      order: { start_date: 'DESC' },
    });
  }

  /**
   * Monthly evidence report for one employee: approved absences overlapping the
   * month + overtime/time-off work logs in the month.
   */
  async getMonthlyReport(userId: string, year: number, month: number) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${year}-${pad(month)}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${year}-${pad(month)}-${pad(lastDay)}`;

    const leaves = await this.leaveRequestRepository
      .createQueryBuilder('lr')
      .where('lr.user_id = :userId', { userId })
      .andWhere('lr.status = :st', { st: LeaveStatus.APPROVED })
      .andWhere('lr.start_date <= :end', { end: endStr })
      .andWhere('lr.end_date >= :start', { start: startStr })
      .orderBy('lr.start_date', 'ASC')
      .getMany();

    const workLogs = await AppDataSource.getRepository(WorkLog)
      .createQueryBuilder('wl')
      .where('wl.user_id = :userId', { userId })
      .andWhere('wl.work_date BETWEEN :s AND :e', { s: startStr, e: endStr })
      .andWhere('wl.work_type IN (:...types)', { types: [WorkLogType.OVERTIME, WorkLogType.OVERTIME_COMP] })
      .orderBy('wl.work_date', 'ASC')
      .getMany();

    return { year, month, daysInMonth: lastDay, leaves, workLogs };
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
    await this.leaveRequestRepository.save(request);
    return (await this.leaveRequestRepository.findOne({ where: { id: requestId }, relations: ['user', 'reviewer'] }))!;
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
    await this.leaveRequestRepository.save(request);
    return (await this.leaveRequestRepository.findOne({ where: { id: requestId }, relations: ['user', 'reviewer'] }))!;
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
   * Permanently delete a leave request (admin only). Comments cascade-delete via FK.
   */
  async deleteLeaveRequest(requestId: string): Promise<void> {
    const result = await this.leaveRequestRepository.delete({ id: requestId });
    if (!result.affected) throw new Error('Wniosek nie znaleziony');
  }

  /**
   * Sum of approved, pool-deducting leave days for a user in a given year.
   */
  private async getUsedLeaveDays(userId: string, year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const approvedRequests = await this.leaveRequestRepository.find({
      where: {
        user_id: userId,
        status: LeaveStatus.APPROVED,
        start_date: Between(startDate, endDate),
      },
    });
    return approvedRequests
      .filter((req) => DEDUCTING_LEAVE_TYPES.includes(req.leave_type))
      .reduce((sum, req) => sum + req.total_days, 0);
  }

  /**
   * Used days per user across all users for a given year (single query).
   */
  private async getUsedDaysByUser(year: number): Promise<Map<string, number>> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const approved = await this.leaveRequestRepository.find({
      where: { status: LeaveStatus.APPROVED, start_date: Between(startDate, endDate) },
    });
    const map = new Map<string, number>();
    for (const req of approved) {
      if (!DEDUCTING_LEAVE_TYPES.includes(req.leave_type)) continue;
      map.set(req.user_id, (map.get(req.user_id) ?? 0) + req.total_days);
    }
    return map;
  }

  /**
   * Approved remote-work (praca zdalna) days for one user in a year.
   */
  private async getUsedRemoteDays(userId: string, year: number): Promise<number> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const approved = await this.leaveRequestRepository.find({
      where: {
        user_id: userId,
        status: LeaveStatus.APPROVED,
        leave_type: LeaveType.REMOTE_WORK,
        start_date: Between(startDate, endDate),
      },
    });
    return approved.reduce((sum, req) => sum + req.total_days, 0);
  }

  /**
   * Approved remote-work days per user across all users in a year.
   */
  private async getUsedRemoteByUser(year: number): Promise<Map<string, number>> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);
    const approved = await this.leaveRequestRepository.find({
      where: {
        status: LeaveStatus.APPROVED,
        leave_type: LeaveType.REMOTE_WORK,
        start_date: Between(startDate, endDate),
      },
    });
    const map = new Map<string, number>();
    for (const req of approved) {
      map.set(req.user_id, (map.get(req.user_id) ?? 0) + req.total_days);
    }
    return map;
  }

  /**
   * Get leave balance for user. Pool = carried-over (zaległy) + this year's entitlement.
   */
  async getUserLeaveBalance(userId: string, year: number = new Date().getFullYear()) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const num = (v: any, d: number) => (v === null || v === undefined ? d : Number(v));

    const hoursPerDay = num(user?.working_hours_per_day, 8);
    const annualLeave = num(user?.annual_leave_days, 20);
    const carriedOver = num(user?.carried_over_days, 0);
    const usedBaseline = num(user?.used_leave_days, 0);
    const usedRequests = await this.getUsedLeaveDays(userId, year);
    const usedDays = usedBaseline + usedRequests;
    const total = annualLeave + carriedOver;

    const remoteAllowance = num(user?.remote_work_days, 24);
    const remoteBaseline = num(user?.used_remote_days, 0);
    const remoteRequests = await this.getUsedRemoteDays(userId, year);
    const remoteUsed = remoteBaseline + remoteRequests;

    return {
      annualLeave,
      carriedOver,
      total,
      usedBaseline,
      usedRequests,
      usedDays,
      remaining: Math.max(0, total - usedDays),
      remoteAllowance,
      remoteUsedBaseline: remoteBaseline,
      remoteUsedRequests: remoteRequests,
      remoteUsed,
      remoteRemaining: Math.max(0, remoteAllowance - remoteUsed),
      hoursPerDay,
      employmentFraction: user?.employment_fraction ?? null,
      year,
    };
  }

  /**
   * Leave plan overview for every user (management view).
   */
  async getLeaveOverview(year: number = new Date().getFullYear()) {
    const users = await this.userRepository.find({
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
    const usedByUser = await this.getUsedDaysByUser(year);
    const remoteByUser = await this.getUsedRemoteByUser(year);
    const num = (v: any, d: number) => (v === null || v === undefined ? d : Number(v));

    return users.map((u) => {
      const annualLeave = num(u.annual_leave_days, 20);
      const carriedOver = num(u.carried_over_days, 0);
      const usedBaseline = num(u.used_leave_days, 0);
      const usedRequests = usedByUser.get(u.id) ?? 0;
      const usedDays = usedBaseline + usedRequests;

      const remoteAllowance = num(u.remote_work_days, 24);
      const remoteBaseline = num(u.used_remote_days, 0);
      const remoteRequests = remoteByUser.get(u.id) ?? 0;
      const remoteUsed = remoteBaseline + remoteRequests;

      return {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        department: u.department,
        position: u.position,
        avatarUrl: u.avatar_url,
        year,
        hoursPerDay: num(u.working_hours_per_day, 8),
        employmentFraction: u.employment_fraction ?? null,
        annualLeave,
        carriedOver,
        usedBaseline,
        usedRequests,
        usedDays,
        available: Math.max(0, annualLeave + carriedOver - usedDays),
        remoteAllowance,
        remoteUsedBaseline: remoteBaseline,
        remoteUsedRequests: remoteRequests,
        remoteUsed,
        remoteAvailable: Math.max(0, remoteAllowance - remoteUsed),
      };
    });
  }

  /**
   * Update a user's leave allocation (carried-over and/or this year's entitlement).
   */
  async updateLeaveAllocation(
    userId: string,
    data: {
      annualLeaveDays?: number;
      carriedOverDays?: number;
      usedLeaveDays?: number;
      remoteWorkDays?: number;
      usedRemoteDays?: number;
      employmentFraction?: string | null;
      workingHoursPerDay?: number;
    },
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const validate = (v: number, label: string) => {
      if (!Number.isFinite(v) || v < 0 || v > 366) {
        throw new Error(`${label} musi być liczbą z zakresu 0–366.`);
      }
    };

    if (data.annualLeaveDays !== undefined) {
      validate(data.annualLeaveDays, 'Limit na ten rok');
      user.annual_leave_days = data.annualLeaveDays;
    }
    if (data.carriedOverDays !== undefined) {
      validate(data.carriedOverDays, 'Dni przeniesione');
      user.carried_over_days = data.carriedOverDays;
    }
    if (data.usedLeaveDays !== undefined) {
      validate(data.usedLeaveDays, 'Wykorzystane dni');
      user.used_leave_days = data.usedLeaveDays;
    }
    if (data.remoteWorkDays !== undefined) {
      validate(data.remoteWorkDays, 'Dni pracy zdalnej');
      user.remote_work_days = data.remoteWorkDays;
    }
    if (data.usedRemoteDays !== undefined) {
      validate(data.usedRemoteDays, 'Wykorzystane dni zdalne');
      user.used_remote_days = data.usedRemoteDays;
    }
    if (data.employmentFraction !== undefined) {
      user.employment_fraction = data.employmentFraction || null;
      // Derive daily hours from the fraction (8h × fraction) unless given explicitly
      const frac = parseEmploymentFraction(data.employmentFraction);
      if (data.workingHoursPerDay === undefined && frac !== null) {
        user.working_hours_per_day = Math.round(8 * frac * 100) / 100;
      }
    }
    if (data.workingHoursPerDay !== undefined && Number.isFinite(data.workingHoursPerDay)) {
      user.working_hours_per_day = data.workingHoursPerDay;
    }

    await this.userRepository.save(user);
    return user;
  }

  // ----- Yearly rollover (Automat 1 stycznia) -----

  private async getSetting(key: string): Promise<string | null> {
    const rows = await AppDataSource.query(
      `SELECT value FROM system_settings WHERE key = $1`,
      [key],
    );
    return rows.length ? rows[0].value : null;
  }

  private async setSetting(key: string, value: string): Promise<void> {
    await AppDataSource.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value],
    );
  }

  /**
   * Close a single year: each user's unused days (carried + entitlement − used)
   * become next year's carried-over balance. The yearly entitlement is left as-is.
   */
  private async runYearRollover(closingYear: number): Promise<void> {
    const users = await this.userRepository.find();
    const usedByUser = await this.getUsedDaysByUser(closingYear);

    for (const u of users) {
      const annual = u.annual_leave_days ?? 20;
      const carried = u.carried_over_days ?? 0;
      const used = usedByUser.get(u.id) ?? 0;
      u.carried_over_days = Math.max(0, carried + annual - used);
    }

    if (users.length) await this.userRepository.save(users);
    console.log(`📅 Leave rollover for ${closingYear} → ${closingYear + 1} done (${users.length} users)`);
  }

  /**
   * Idempotent rollover guard. Runs any missed year-boundaries automatically.
   * On first ever run it only records the current year (no historical rollover).
   */
  async ensureLeaveRollover(): Promise<void> {
    const currentYear = new Date().getFullYear();
    const marker = await this.getSetting('leave_last_rollover_year');

    if (marker === null) {
      await this.setSetting('leave_last_rollover_year', String(currentYear));
      return;
    }

    const lastYear = parseInt(marker, 10);
    if (!Number.isFinite(lastYear) || currentYear <= lastYear) return;

    for (let closingYear = lastYear; closingYear < currentYear; closingYear++) {
      await this.runYearRollover(closingYear);
    }
    await this.setSetting('leave_last_rollover_year', String(currentYear));
  }
}
