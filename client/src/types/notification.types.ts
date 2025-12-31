export enum NotificationType {
  CHAT_MESSAGE = 'chat_message',
  CHAT_MENTION = 'chat_mention',
  CHANNEL_INVITE = 'channel_invite',
  TIME_ENTRY_APPROVED = 'time_entry_approved',
  TIME_ENTRY_REJECTED = 'time_entry_rejected',
  LEAVE_REQUEST_APPROVED = 'leave_request_approved',
  LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
  LEAVE_REQUEST_PENDING = 'leave_request_pending',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  USER_STATUS_CHANGED = 'user_status_changed',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any> | null;
  action_url: string | null;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  related_user_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  totalPages: number;
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  [NotificationType.CHAT_MESSAGE]: '💬',
  [NotificationType.CHAT_MENTION]: '@',
  [NotificationType.CHANNEL_INVITE]: '👥',
  [NotificationType.TIME_ENTRY_APPROVED]: '✅',
  [NotificationType.TIME_ENTRY_REJECTED]: '❌',
  [NotificationType.LEAVE_REQUEST_APPROVED]: '✅',
  [NotificationType.LEAVE_REQUEST_REJECTED]: '❌',
  [NotificationType.LEAVE_REQUEST_PENDING]: '⏰',
  [NotificationType.SYSTEM_ANNOUNCEMENT]: '📢',
  [NotificationType.USER_STATUS_CHANGED]: '🟢',
};

export const NOTIFICATION_COLORS: Record<NotificationPriority, string> = {
  [NotificationPriority.LOW]: 'bg-gray-100 border-gray-300',
  [NotificationPriority.NORMAL]: 'bg-blue-50 border-blue-300',
  [NotificationPriority.HIGH]: 'bg-orange-50 border-orange-300',
  [NotificationPriority.URGENT]: 'bg-red-50 border-red-300',
};
