import apiClient from './client';
import { Notification, NotificationListResponse, NotificationPriority } from '../types/notification.types';

/**
 * Get user's notifications
 */
export const getNotifications = async (
  page: number = 1,
  limit: number = 20,
  unreadOnly: boolean = false
): Promise<NotificationListResponse> => {
  const response = await apiClient.get('/notifications', {
    params: { page, limit, unreadOnly },
  });
  return response.data.data;
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data.data.count;
};

/**
 * Get notification by ID
 */
export const getNotificationById = async (id: string): Promise<Notification> => {
  const response = await apiClient.get(`/notifications/${id}`);
  return response.data.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (id: string): Promise<Notification> => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<void> => {
  await apiClient.put('/notifications/read-all');
};

/**
 * Delete notification
 */
export const deleteNotification = async (id: string): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

/**
 * Delete all read notifications
 */
export const deleteAllRead = async (): Promise<number> => {
  const response = await apiClient.delete('/notifications/read');
  return response.data.data.count;
};

/**
 * Delete all notifications
 */
export const deleteAll = async (): Promise<number> => {
  const response = await apiClient.delete('/notifications/all');
  return response.data.data.count;
};

/**
 * Send system announcement (admin only)
 */
export const sendAnnouncement = async (
  title: string,
  message: string,
  priority?: NotificationPriority
): Promise<number> => {
  const response = await apiClient.post('/notifications/announcement', {
    title,
    message,
    priority,
  });
  return response.data.data.count;
};
