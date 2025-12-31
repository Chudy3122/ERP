import apiClient from './client';
import {
  AdminUser,
  UserListResponse,
  SystemStats,
  UserActivity,
  CreateUserData,
  UpdateUserData,
} from '../types/admin.types';

/**
 * Get all users
 */
export const getAllUsers = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string
): Promise<UserListResponse> => {
  const response = await apiClient.get('/admin/users', {
    params: { page, limit, search, role },
  });
  return response.data.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string): Promise<AdminUser> => {
  const response = await apiClient.get(`/admin/users/${id}`);
  return response.data.data;
};

/**
 * Create user
 */
export const createUser = async (data: CreateUserData): Promise<AdminUser> => {
  const response = await apiClient.post('/admin/users', data);
  return response.data.data;
};

/**
 * Update user
 */
export const updateUser = async (id: string, data: UpdateUserData): Promise<AdminUser> => {
  const response = await apiClient.put(`/admin/users/${id}`, data);
  return response.data.data;
};

/**
 * Delete user
 */
export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/users/${id}`);
};

/**
 * Activate user
 */
export const activateUser = async (id: string): Promise<AdminUser> => {
  const response = await apiClient.post(`/admin/users/${id}/activate`);
  return response.data.data;
};

/**
 * Deactivate user
 */
export const deactivateUser = async (id: string): Promise<AdminUser> => {
  const response = await apiClient.post(`/admin/users/${id}/deactivate`);
  return response.data.data;
};

/**
 * Reset user password
 */
export const resetUserPassword = async (id: string, newPassword: string): Promise<void> => {
  await apiClient.post(`/admin/users/${id}/reset-password`, { newPassword });
};

/**
 * Get system statistics
 */
export const getSystemStats = async (): Promise<SystemStats> => {
  const response = await apiClient.get('/admin/stats');
  return response.data.data;
};

/**
 * Get user activity
 */
export const getUserActivity = async (id: string): Promise<UserActivity> => {
  const response = await apiClient.get(`/admin/users/${id}/activity`);
  return response.data.data;
};

/**
 * Get recent registrations
 */
export const getRecentRegistrations = async (limit: number = 10): Promise<AdminUser[]> => {
  const response = await apiClient.get('/admin/recent-registrations', {
    params: { limit },
  });
  return response.data.data;
};

/**
 * Get online users count
 */
export const getOnlineCount = async (): Promise<number> => {
  const response = await apiClient.get('/admin/online-count');
  return response.data.data.count;
};
