import { AppDataSource } from '../config/database';
import { TimeEntry, TimeEntryStatus } from '../models/TimeEntry.model';
import { LeaveRequest, LeaveStatus } from '../models/LeaveRequest.model';
import { User } from '../models/User.model';
import { Between, In } from 'typeorm';

export interface CalendarEvent {
  id: string;
  userId: string;
  userName: string;
  type: 'leave' | 'work' | 'absence';
  title: string;
  start: Date;
  end: Date | null;
  status: string;
  details?: any;
}

export interface TeamAvailability {
  date: string;
  users: {
    id: string;
    name: string;
    status: 'working' | 'on_leave' | 'absent';
    details?: string;
  }[];
}

export class CalendarService {
  private timeEntryRepository = AppDataSource.getRepository(TimeEntry);
  private leaveRepository = AppDataSource.getRepository(LeaveRequest);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get team calendar events
   */
  async getTeamCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Get leave requests
    const leaveRequests = await this.leaveRepository.find({
      where: {
        start_date: Between(startDate, endDate),
        status: In([LeaveStatus.APPROVED, LeaveStatus.PENDING]),
      },
      relations: ['user'],
      order: {
        start_date: 'ASC',
      },
    });

    // Add leave events
    leaveRequests.forEach((leave) => {
      if (leave.user) {
        events.push({
          id: leave.id,
          userId: leave.user_id,
          userName: `${leave.user.first_name} ${leave.user.last_name}`,
          type: 'leave',
          title: `${leave.user.first_name} ${leave.user.last_name} - ${this.translateLeaveType(leave.leave_type)}`,
          start: new Date(leave.start_date),
          end: new Date(leave.end_date),
          status: leave.status,
          details: {
            leaveType: leave.leave_type,
            reason: leave.reason,
            totalDays: leave.total_days,
          },
        });
      }
    });

    // Get time entries (work sessions) - include IN_PROGRESS to show active sessions
    const timeEntries = await this.timeEntryRepository.find({
      where: {
        clock_in: Between(startDate, endDate),
        status: In([TimeEntryStatus.IN_PROGRESS, TimeEntryStatus.COMPLETED, TimeEntryStatus.APPROVED]),
      },
      relations: ['user'],
      order: {
        clock_in: 'ASC',
      },
    });

    // Add work events
    timeEntries.forEach((entry) => {
      if (entry.user) {
        const isActive = entry.status === TimeEntryStatus.IN_PROGRESS;
        events.push({
          id: entry.id,
          userId: entry.user_id,
          userName: `${entry.user.first_name} ${entry.user.last_name}`,
          type: 'work',
          title: `${entry.user.first_name} ${entry.user.last_name} - ${isActive ? 'W pracy' : 'Praca'}`,
          start: new Date(entry.clock_in),
          end: entry.clock_out ? new Date(entry.clock_out) : null,
          status: entry.status,
          details: {
            duration: entry.duration_minutes,
            overtime: entry.overtime_minutes,
            isLate: entry.is_late,
            lateMinutes: entry.late_minutes,
            isActive: isActive,
          },
        });
      }
    });

    return events;
  }

  /**
   * Get team availability for a specific date range
   */
  async getTeamAvailability(startDate: Date, endDate: Date): Promise<TeamAvailability[]> {
    // Fetch all data in 3 queries instead of N*days queries
    const users = await this.userRepository.find({
      order: { first_name: 'ASC', last_name: 'ASC' },
    });

    const leaves = await this.leaveRepository.find({
      where: { status: LeaveStatus.APPROVED },
    });

    const timeEntries = await this.timeEntryRepository.find({
      where: { clock_in: Between(startDate, endDate) },
    });

    // Index leaves and time entries by user_id for fast lookup
    const leavesByUser = new Map<string, typeof leaves>();
    for (const leave of leaves) {
      if (!leavesByUser.has(leave.user_id)) leavesByUser.set(leave.user_id, []);
      leavesByUser.get(leave.user_id)!.push(leave);
    }

    const entriesByUserAndDate = new Map<string, typeof timeEntries[0]>();
    for (const entry of timeEntries) {
      const dateKey = `${entry.user_id}_${new Date(entry.clock_in).toISOString().split('T')[0]}`;
      entriesByUserAndDate.set(dateKey, entry);
    }

    const availability: TeamAvailability[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);

      const dayAvailability: TeamAvailability = { date: dateStr, users: [] };

      for (const user of users) {
        const userLeaves = leavesByUser.get(user.id) || [];
        const onLeave = userLeaves.find(
          l => dayStart >= new Date(l.start_date) && dayStart <= new Date(l.end_date)
        );

        if (onLeave) {
          dayAvailability.users.push({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            status: 'on_leave',
            details: this.translateLeaveType(onLeave.leave_type),
          });
          continue;
        }

        const workEntry = entriesByUserAndDate.get(`${user.id}_${dateStr}`);
        if (workEntry) {
          const isActive = workEntry.status === TimeEntryStatus.IN_PROGRESS;
          dayAvailability.users.push({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            status: 'working',
            details: workEntry.clock_out
              ? `${this.formatTime(workEntry.clock_in)} - ${this.formatTime(workEntry.clock_out)}`
              : isActive
                ? `W pracy od ${this.formatTime(workEntry.clock_in)}`
                : `Od ${this.formatTime(workEntry.clock_in)}`,
          });
        } else {
          dayAvailability.users.push({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            status: 'absent',
          });
        }
      }

      availability.push(dayAvailability);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  }

  /**
   * Get user calendar events
   */
  async getUserCalendarEvents(userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Get leave requests
    const leaveRequests = await this.leaveRepository.find({
      where: {
        user_id: userId,
        start_date: Between(startDate, endDate),
      },
      relations: ['user'],
      order: {
        start_date: 'ASC',
      },
    });

    leaveRequests.forEach((leave) => {
      if (leave.user) {
        events.push({
          id: leave.id,
          userId: leave.user_id,
          userName: `${leave.user.first_name} ${leave.user.last_name}`,
          type: 'leave',
          title: this.translateLeaveType(leave.leave_type),
          start: new Date(leave.start_date),
          end: new Date(leave.end_date),
          status: leave.status,
          details: {
            leaveType: leave.leave_type,
            reason: leave.reason,
            totalDays: leave.total_days,
          },
        });
      }
    });

    // Get time entries
    const timeEntries = await this.timeEntryRepository.find({
      where: {
        user_id: userId,
        clock_in: Between(startDate, endDate),
      },
      relations: ['user'],
      order: {
        clock_in: 'ASC',
      },
    });

    timeEntries.forEach((entry) => {
      if (entry.user) {
        events.push({
          id: entry.id,
          userId: entry.user_id,
          userName: `${entry.user.first_name} ${entry.user.last_name}`,
          type: 'work',
          title: 'Sesja pracy',
          start: new Date(entry.clock_in),
          end: entry.clock_out ? new Date(entry.clock_out) : null,
          status: entry.status,
          details: {
            duration: entry.duration_minutes,
            overtime: entry.overtime_minutes,
            isLate: entry.is_late,
            lateMinutes: entry.late_minutes,
          },
        });
      }
    });

    return events;
  }

  /**
   * Translate leave type to Polish
   */
  private translateLeaveType(leaveType: string): string {
    const translations: { [key: string]: string } = {
      vacation: 'Urlop wypoczynkowy',
      sick_leave: 'Zwolnienie lekarskie',
      personal: 'Urlop okolicznościowy',
      unpaid: 'Urlop bezpłatny',
      parental: 'Urlop rodzicielski',
      other: 'Inny',
    };
    return translations[leaveType] || leaveType;
  }

  /**
   * Format time
   */
  private formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export default new CalendarService();
