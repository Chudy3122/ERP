import apiClient from './axios-config';
import type {
  TimeEntry,
  LeaveRequest,
  TimeStats,
  LeaveBalance,
  LeaveOverviewRow,
  ClockInRequest,
  ClockOutRequest,
  CreateLeaveRequest,
  ReviewLeaveRequest,
  DayStatus,
  ManualEntryRequest,
} from '../types/time.types';

// ===== TIME ENTRIES =====

/**
 * Clock in (start work / resume after end-of-day)
 */
export const clockIn = async (data?: ClockInRequest): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/clock-in', data);
  return response.data.data;
};

/**
 * Clock out (legacy)
 */
export const clockOut = async (data?: ClockOutRequest): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/clock-out', data);
  return response.data.data;
};

/**
 * Get today's day status (state machine)
 */
export const getDayStatus = async (): Promise<DayStatus> => {
  const response = await apiClient.get('/time/day-status');
  return response.data.data;
};

/**
 * Pause work
 */
export const pauseWork = async (notes?: string): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/pause', { notes });
  return response.data.data;
};

/**
 * End work for the day (works from both 'working' and 'paused' states)
 */
export const endWork = async (notes?: string): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/end-work', { notes });
  return response.data.data;
};

/**
 * Add a manual time entry
 */
export const addManualEntry = async (data: ManualEntryRequest): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/manual-entry', data);
  return response.data.data;
};

/**
 * Get current active time entry
 */
export const getCurrentEntry = async (): Promise<TimeEntry | null> => {
  const response = await apiClient.get('/time/current');
  return response.data.data;
};

/**
 * Get user's time entries
 * @param startDate - Start date (ISO string)
 * @param endDate - End date (ISO string)
 */
export const getUserTimeEntries = async (
  startDate?: string,
  endDate?: string
): Promise<TimeEntry[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/time/entries?${params.toString()}`);
  return response.data.data;
};

/**
 * Get all time entries (admin/kierownik only)
 */
export const getAllTimeEntries = async (
  startDate?: string,
  endDate?: string
): Promise<TimeEntry[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/time/entries/all?${params.toString()}`);
  return response.data.data;
};

/**
 * Get user's time statistics
 */
export const getUserTimeStats = async (
  startDate?: string,
  endDate?: string
): Promise<TimeStats> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/time/stats?${params.toString()}`);
  return response.data.data;
};

/**
 * Approve time entry (admin/kierownik only)
 */
export const approveTimeEntry = async (entryId: string): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}/approve`);
  return response.data.data;
};

/**
 * Reject time entry (admin/kierownik only)
 */
export const rejectTimeEntry = async (entryId: string): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}/reject`);
  return response.data.data;
};

/**
 * Update notes/description on a time entry (owner only)
 */
export const updateEntryNotes = async (entryId: string, notes: string): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}/notes`, { notes });
  return response.data.data;
};

/**
 * Edit a time entry (admin only) — clock-in/out + notes
 */
export const updateTimeEntry = async (
  entryId: string,
  data: { clock_in?: string; clock_out?: string | null; notes?: string }
): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}`, data);
  return response.data.data;
};

/**
 * Delete a time entry (admin only)
 */
export const deleteTimeEntry = async (entryId: string): Promise<void> => {
  await apiClient.delete(`/time/entries/${entryId}`);
};

// ===== LEAVE REQUESTS =====

/**
 * Create leave request
 */
export const createLeaveRequest = async (data: CreateLeaveRequest): Promise<LeaveRequest> => {
  const response = await apiClient.post('/time/leave', data);
  return response.data.data;
};

/**
 * Get user's leave requests
 */
export const getUserLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await apiClient.get('/time/leave');
  return response.data.data;
};

/**
 * Get pending leave requests (admin/kierownik only)
 */
export const getPendingLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await apiClient.get('/time/leave/pending');
  return response.data.data;
};

/**
 * Get all manageable leave requests — pending + reviewed (managers only)
 */
export const getManageableLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await apiClient.get('/time/leave/manageable');
  return response.data.data;
};

export interface LeaveComment {
  id: string;
  leave_request_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string; avatar_url: string | null };
}

/** Get comments for a leave request */
export const getLeaveComments = async (requestId: string): Promise<LeaveComment[]> => {
  const response = await apiClient.get(`/time/leave/${requestId}/comments`);
  return response.data.data;
};

/** Add a comment to a leave request */
export const addLeaveComment = async (requestId: string, content: string): Promise<LeaveComment> => {
  const response = await apiClient.post(`/time/leave/${requestId}/comments`, { content });
  return response.data.data;
};

/**
 * Get user's leave balance
 */
export const getUserLeaveBalance = async (year?: number): Promise<LeaveBalance> => {
  const params = year ? `?year=${year}` : '';
  const response = await apiClient.get(`/time/leave/balance${params}`);
  return response.data.data;
};

/**
 * Leave plan overview for all users (admin/kadry)
 */
export const getLeaveOverview = async (year?: number): Promise<LeaveOverviewRow[]> => {
  const params = year ? `?year=${year}` : '';
  const response = await apiClient.get(`/time/leave/overview${params}`);
  return response.data.data;
};

/**
 * Update a user's leave allocation (admin/kadry)
 */
export const updateLeaveAllocation = async (
  userId: string,
  data: { annualLeaveDays?: number; carriedOverDays?: number }
): Promise<{ id: string; annualLeave: number; carriedOver: number }> => {
  const response = await apiClient.put(`/time/leave/allocation/${userId}`, data);
  return response.data.data;
};

/**
 * Approve leave request (admin/kierownik only)
 */
export const approveLeaveRequest = async (
  requestId: string,
  data?: ReviewLeaveRequest
): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/approve`, data);
  return response.data.data;
};

/**
 * Reject leave request (admin/kierownik only)
 */
export const rejectLeaveRequest = async (
  requestId: string,
  data?: ReviewLeaveRequest
): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/reject`, data);
  return response.data.data;
};

/**
 * Cancel leave request (owner)
 */
export const cancelLeaveRequest = async (requestId: string): Promise<LeaveRequest> => {
  const response = await apiClient.delete(`/time/leave/${requestId}`);
  return response.data.data;
};

/**
 * Revert a reviewed leave request back to pending (managers only)
 */
export const revertLeaveRequest = async (requestId: string): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/revert`);
  return response.data.data;
};

/**
 * Force-cancel any leave request (managers only)
 */
export const adminCancelLeaveRequest = async (requestId: string): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/cancel`);
  return response.data.data;
};

/**
 * Permanently delete a leave request (admin only)
 */
export const deleteLeaveRequest = async (requestId: string): Promise<void> => {
  await apiClient.delete(`/time/leave/${requestId}/hard`);
};

interface AttendanceRangeParams {
  days?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Get attendance overview for all users
 */
export const getAttendance = async (params: number | AttendanceRangeParams = 7) => {
  const query = new URLSearchParams();

  if (typeof params === 'number') {
    query.append('days', String(params));
  } else {
    if (params.days) query.append('days', String(params.days));
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
  }

  const response = await apiClient.get(`/time/attendance?${query.toString()}`);
  return response.data.data;
};

export default {
  clockIn,
  clockOut,
  getCurrentEntry,
  getUserTimeEntries,
  getAllTimeEntries,
  getUserTimeStats,
  approveTimeEntry,
  rejectTimeEntry,
  createLeaveRequest,
  getUserLeaveRequests,
  getPendingLeaveRequests,
  getUserLeaveBalance,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
};
