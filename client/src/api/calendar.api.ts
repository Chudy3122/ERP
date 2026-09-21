import { compareUsersByLastName, formatUserName } from '../utils/userSorting';
import apiClient from './axios-config';
import { getDirectory } from './user.api';

export interface CalendarEvent {
  id: string;
  userId: string;
  userName: string;
  type: 'leave' | 'work' | 'absence';
  title: string;
  start: string;
  end: string | null;
  status: string;
  details?: any;
}

export interface TeamAvailability {
  date: string;
  users: {
    id: string;
    name: string;
    status: 'working' | 'on_leave' | 'absent' | 'remote';
    details?: string;
  }[];
}

/**
 * Get team calendar events
 */
export const getTeamCalendarEvents = async (
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/calendar/team?${params.toString()}`);
  return response.data.data;
};

/**
 * Get team availability
 */
export const getTeamAvailability = async (
  startDate?: string,
  endDate?: string
): Promise<TeamAvailability[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const [response, directory] = await Promise.all([
    apiClient.get(`/calendar/availability?${params.toString()}`),
    getDirectory().catch(() => []),
  ]);
  const usersById = new Map(directory.map(user => [user.id, user]));

  return (response.data.data as TeamAvailability[]).map(day => ({
    ...day,
    users: [...day.users].sort((a, b) => compareUsersByLastName(
      usersById.get(a.id) ?? { email: a.name },
      usersById.get(b.id) ?? { email: b.name },
    )).map(user => ({
      ...user,
      name: formatUserName(usersById.get(user.id), user.name),
    })),
  }));
};

/**
 * Get my calendar events
 */
export const getMyCalendarEvents = async (
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/calendar/my?${params.toString()}`);
  return response.data.data;
};

/**
 * Get user calendar events
 */
export const getUserCalendarEvents = async (
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await apiClient.get(`/calendar/user/${userId}?${params.toString()}`);
  return response.data.data;
};

export default {
  getTeamCalendarEvents,
  getTeamAvailability,
  getMyCalendarEvents,
  getUserCalendarEvents,
};
