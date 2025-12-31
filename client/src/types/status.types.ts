export enum StatusType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  IN_MEETING = 'in_meeting',
}

export interface UserStatus {
  id: string;
  user_id: string;
  status: StatusType;
  custom_message: string | null;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface StatusUpdateData {
  status: StatusType;
  custom_message?: string;
}

export interface StatusStats {
  online: number;
  offline: number;
  away: number;
  busy: number;
  in_meeting: number;
  total: number;
}

export const STATUS_LABELS: Record<StatusType, string> = {
  [StatusType.ONLINE]: 'Online',
  [StatusType.OFFLINE]: 'Offline',
  [StatusType.AWAY]: 'Away',
  [StatusType.BUSY]: 'Busy',
  [StatusType.IN_MEETING]: 'In Meeting',
};

export const STATUS_COLORS: Record<StatusType, string> = {
  [StatusType.ONLINE]: 'bg-green-500',
  [StatusType.OFFLINE]: 'bg-gray-400',
  [StatusType.AWAY]: 'bg-yellow-500',
  [StatusType.BUSY]: 'bg-red-500',
  [StatusType.IN_MEETING]: 'bg-purple-500',
};

export const STATUS_EMOJI: Record<StatusType, string> = {
  [StatusType.ONLINE]: '🟢',
  [StatusType.OFFLINE]: '⚫',
  [StatusType.AWAY]: '🟡',
  [StatusType.BUSY]: '🔴',
  [StatusType.IN_MEETING]: '🟣',
};
