import apiClient from './axios-config';
import type {
  TimeEntry,
  LeaveRequest,
  TimeStats,
  LeaveBalance,
  ClockInRequest,
  ClockOutRequest,
  CreateLeaveRequest,
  ReviewLeaveRequest,
} from '../types/time.types';

// ===== TIME ENTRIES =====

/**
 * Clock in
 */
export const clockIn = async (data?: ClockInRequest): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/clock-in', data);
  return response.data.data;
};

/**
 * Clock out
 */
export const clockOut = async (data?: ClockOutRequest): Promise<TimeEntry> => {
  const response = await apiClient.post('/time/clock-out', data);
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
 * Get all time entries (admin/team_leader only)
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
 * Approve time entry (admin/team_leader only)
 */
export const approveTimeEntry = async (entryId: string): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}/approve`);
  return response.data.data;
};

/**
 * Reject time entry (admin/team_leader only)
 */
export const rejectTimeEntry = async (entryId: string): Promise<TimeEntry> => {
  const response = await apiClient.put(`/time/entries/${entryId}/reject`);
  return response.data.data;
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
 * Get pending leave requests (admin/team_leader only)
 */
export const getPendingLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const response = await apiClient.get('/time/leave/pending');
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
 * Approve leave request (admin/team_leader only)
 */
export const approveLeaveRequest = async (
  requestId: string,
  data?: ReviewLeaveRequest
): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/approve`, data);
  return response.data.data;
};

/**
 * Reject leave request (admin/team_leader only)
 */
export const rejectLeaveRequest = async (
  requestId: string,
  data?: ReviewLeaveRequest
): Promise<LeaveRequest> => {
  const response = await apiClient.put(`/time/leave/${requestId}/reject`, data);
  return response.data.data;
};

/**
 * Cancel leave request
 */
export const cancelLeaveRequest = async (requestId: string): Promise<LeaveRequest> => {
  const response = await apiClient.delete(`/time/leave/${requestId}`);
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
