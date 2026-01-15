import apiClient from './axios-config';

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
    status: 'working' | 'on_leave' | 'absent';
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

  const response = await apiClient.get(`/calendar/availability?${params.toString()}`);
  return response.data.data;
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
