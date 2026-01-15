import apiClient from './client';
import { UserStatus, StatusUpdateData, StatusStats } from '../types/status.types';

/**
 * Get current user's status
 */
export const getMyStatus = async (): Promise<UserStatus> => {
  const response = await apiClient.get('/status/me');
  return response.data.data;
};

/**
 * Update current user's status
 */
export const updateMyStatus = async (data: StatusUpdateData): Promise<UserStatus> => {
  const response = await apiClient.put('/status/me', data);
  return response.data.data;
};

/**
 * Set status to online
 */
export const setStatusOnline = async (): Promise<UserStatus> => {
  const response = await apiClient.post('/status/online');
  return response.data.data;
};

/**
 * Set status to offline
 */
export const setStatusOffline = async (): Promise<UserStatus> => {
  const response = await apiClient.post('/status/offline');
  return response.data.data;
};

/**
 * Set status to away
 */
export const setStatusAway = async (customMessage?: string): Promise<UserStatus> => {
  const response = await apiClient.post('/status/away', { custom_message: customMessage });
  return response.data.data;
};

/**
 * Set status to busy
 */
export const setStatusBusy = async (customMessage?: string): Promise<UserStatus> => {
  const response = await apiClient.post('/status/busy', { custom_message: customMessage });
  return response.data.data;
};

/**
 * Set status to in meeting
 */
export const setStatusInMeeting = async (customMessage?: string): Promise<UserStatus> => {
  const response = await apiClient.post('/status/in-meeting', { custom_message: customMessage });
  return response.data.data;
};

/**
 * Get another user's status
 */
export const getUserStatus = async (userId: string): Promise<UserStatus> => {
  const response = await apiClient.get(`/status/user/${userId}`);
  return response.data.data;
};

/**
 * Get multiple users' statuses
 */
export const getBatchStatuses = async (userIds: string[]): Promise<UserStatus[]> => {
  const response = await apiClient.post('/status/batch', { userIds });
  return response.data.data;
};

/**
 * Get all online users
 */
export const getOnlineUsers = async (): Promise<UserStatus[]> => {
  const response = await apiClient.get('/status/online');
  return response.data.data;
};

/**
 * Get status statistics
 */
export const getStatusStats = async (): Promise<StatusStats> => {
  const response = await apiClient.get('/status/stats');
  return response.data.data;
};
