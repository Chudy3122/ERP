import { User } from './auth.types';

export enum TimeEntryStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum LeaveType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  PERSONAL = 'personal',
  UNPAID = 'unpaid',
  PARENTAL = 'parental',
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
  expected_clock_in: string | null;
  status: TimeEntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  approver?: User | null;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
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
  usedDays: number;
  remaining: number;
  year: number;
}

export interface ClockInRequest {
  notes?: string;
  expectedClockIn?: string;
}

export interface ClockOutRequest {
  notes?: string;
}

export interface CreateLeaveRequest {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ReviewLeaveRequest {
  notes?: string;
}
