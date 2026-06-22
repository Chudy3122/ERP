import { User } from './auth.types';

export enum TimeEntryStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LeaveType {
  VACATION = 'vacation',
  PERSONAL = 'personal',
  SICK_LEAVE = 'sick_leave',
  UNPAID = 'unpaid',
  PARENTAL = 'parental',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  CHILDCARE_188 = 'childcare_188',
  CARE = 'care',
  OCCASIONAL = 'occasional',
  OCCASIONAL_HOURLY = 'occasional_hourly',
  REMOTE_WORK = 'remote_work',
  HOLIDAY_SATURDAY = 'holiday_saturday',
  OTHER = 'other',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_overtime: boolean;
  overtime_minutes: number;
  is_late: boolean;
  late_minutes: number;
  is_break: boolean;
  is_manual: boolean;
  clock_in_device?: string | null; // 'mobile' | 'tablet' | 'desktop'
  clock_in_ip?: string | null;
  clock_out_device?: string | null;
  clock_out_ip?: string | null;
  expected_clock_in: string | null;
  status: TimeEntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  approver?: User | null;
}

export type DayState = 'not_started' | 'working' | 'paused' | 'ended';

export interface DayStatus {
  state: DayState;
  currentEntry: TimeEntry | null;
  todayEntries: TimeEntry[];
  totalWorkedMinutesToday: number;
}

export interface ManualEntryRequest {
  date: string;    // YYYY-MM-DD
  clockIn: string; // HH:MM
  clockOut: string;// HH:MM
  notes?: string;
  userId?: string; // admin/kadry: log for another employee
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  start_time?: string | null;
  end_time?: string | null;
  hours?: number | null;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  reviewer?: User | null;
}

export interface TimeStats {
  totalHours: number;
  totalMinutes: number;
  overtimeHours: number;
  overtimeMinutes: number;
  daysWorked: number;
  entriesCount: number;
  averageHoursPerDay: number;
}

export interface LeaveBalance {
  annualLeave: number;
  carriedOver: number;
  total: number;
  usedBaseline: number;
  usedRequests: number;
  usedDays: number;
  remaining: number;
  remoteAllowance: number;
  remoteUsedBaseline: number;
  remoteUsedRequests: number;
  remoteUsed: number;
  remoteRemaining: number;
  hoursPerDay: number;
  employmentFraction: string | null;
  year: number;
}

export interface LeaveOverviewRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  position: string | null;
  avatarUrl: string | null;
  year: number;
  hoursPerDay: number;
  employmentFraction: string | null;
  annualLeave: number;
  carriedOver: number;
  usedBaseline: number;
  usedRequests: number;
  usedDays: number;
  available: number;
  remoteAllowance: number;
  remoteUsedBaseline: number;
  remoteUsedRequests: number;
  remoteUsed: number;
  remoteAvailable: number;
}

export interface ClockInRequest {
  notes?: string;
  expectedClockIn?: string;
  clockInTime?: string; // backdated manual start (ISO) — timer runs live from this time
  userId?: string; // admin/kadry: start the timer on behalf of another employee
}

export interface ClockOutRequest {
  notes?: string;
}

export interface CreateLeaveRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  startTime?: string; // occasional_hourly: HH:MM
  endTime?: string;   // occasional_hourly: HH:MM
  userId?: string; // admin/kadry: file on behalf of another employee
}

export interface ReviewLeaveRequest {
  notes?: string;
}
