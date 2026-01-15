import apiClient from './axios-config';

export interface NotificationPreference {
  id: string;
  user_id: string;
  sound_enabled: boolean;
  sound_type: string;
  sound_volume: number;
  desktop_notifications: boolean;
  show_preview: boolean;
  badge_count: boolean;
  notify_messages: boolean;
  notify_mentions: boolean;
  notify_leave_status: boolean;
  notify_time_reminders: boolean;
  notify_system_updates: boolean;
  dnd_enabled: boolean;
  dnd_start_time: string | null;
  dnd_end_time: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateNotificationPreferencesData {
  sound_enabled?: boolean;
  sound_type?: string;
  sound_volume?: number;
  desktop_notifications?: boolean;
  show_preview?: boolean;
  badge_count?: boolean;
  notify_messages?: boolean;
  notify_mentions?: boolean;
  notify_leave_status?: boolean;
  notify_time_reminders?: boolean;
  notify_system_updates?: boolean;
  dnd_enabled?: boolean;
  dnd_start_time?: string | null;
  dnd_end_time?: string | null;
}

/**
 * Get current user's notification preferences
 */
export const getMyPreferences = async (): Promise<NotificationPreference> => {
  const response = await apiClient.get('/notification-preferences');
  return response.data.data;
};

/**
 * Update notification preferences
 */
export const updatePreferences = async (
  data: UpdateNotificationPreferencesData
): Promise<NotificationPreference> => {
  const response = await apiClient.put('/notification-preferences', data);
  return response.data.data;
};

/**
 * Reset preferences to default
 */
export const resetToDefault = async (): Promise<NotificationPreference> => {
  const response = await apiClient.post('/notification-preferences/reset');
  return response.data.data;
};

/**
 * Check if user is in DND mode
 */
export const getDndStatus = async (): Promise<boolean> => {
  const response = await apiClient.get('/notification-preferences/dnd-status');
  return response.data.data.isDnd;
};

export default {
  getMyPreferences,
  updatePreferences,
  resetToDefault,
  getDndStatus,
};
