import apiClient from './axios-config';

export enum MeetingPlatform {
  JITSI = 'jitsi',
}

export interface MeetingLink {
  platform: MeetingPlatform;
  url: string;
  roomName: string;
  meetingId: string;
  title?: string;
  createdBy: string;
  createdAt: Date;
  formattedMessage?: string;
}

export interface GenerateMeetingLinkRequest {
  platform: MeetingPlatform;
  title?: string;
}

export interface ValidateMeetingUrlRequest {
  url: string;
}

export interface ValidateMeetingUrlResponse {
  isValid: boolean;
  platform?: MeetingPlatform;
  meetingId?: string;
}

/**
 * Generate a meeting link for a specific platform
 */
export const generateMeetingLink = async (
  request: GenerateMeetingLinkRequest
): Promise<MeetingLink> => {
  const response = await apiClient.post('/meetings/generate', request);
  return response.data.data;
};

/**
 * Validate a meeting URL
 */
export const validateMeetingUrl = async (
  request: ValidateMeetingUrlRequest
): Promise<ValidateMeetingUrlResponse> => {
  const response = await apiClient.post('/meetings/validate', request);
  return response.data.data;
};

// New meeting types for full meeting management
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  started_at?: string;
  ended_at?: string;
  status: 'scheduled' | 'active' | 'ended';
  room_id: string;
  created_at: string;
  participants: MeetingParticipant[];
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface MeetingParticipant {
  id: string;
  user_id: string;
  meeting_id: string;
  status: 'invited' | 'accepted' | 'rejected' | 'in_call';
  joined_at?: string;
  left_at?: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  participant_ids: string[];
}

/**
 * Create a new meeting with participants
 */
export const createMeeting = async (data: CreateMeetingRequest): Promise<Meeting> => {
  const response = await apiClient.post('/meetings', data);
  return response.data;
};

/**
 * Get my meetings
 */
export const getMyMeetings = async (): Promise<Meeting[]> => {
  const response = await apiClient.get('/meetings/my');
  return response.data;
};

/**
 * Get meeting by ID
 */
export const getMeetingById = async (id: string): Promise<Meeting> => {
  const response = await apiClient.get(`/meetings/${id}`);
  return response.data;
};

/**
 * Accept meeting invitation
 */
export const acceptMeeting = async (meetingId: string): Promise<void> => {
  await apiClient.post(`/meetings/${meetingId}/accept`);
};

/**
 * Reject meeting invitation
 */
export const rejectMeeting = async (meetingId: string): Promise<void> => {
  await apiClient.post(`/meetings/${meetingId}/reject`);
};

/**
 * Join meeting
 */
export const joinMeeting = async (meetingId: string): Promise<void> => {
  await apiClient.post(`/meetings/${meetingId}/join`);
};

/**
 * Leave meeting
 */
export const leaveMeeting = async (meetingId: string): Promise<void> => {
  await apiClient.post(`/meetings/${meetingId}/leave`);
};

/**
 * End meeting
 */
export const endMeeting = async (meetingId: string): Promise<void> => {
  await apiClient.post(`/meetings/${meetingId}/end`);
};

// Scheduled meetings types and API

export type ScheduledMeetingPlatform = 'internal' | 'teams' | 'zoom' | 'google_meet';

export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  platform: ScheduledMeetingPlatform;
  meeting_link?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  participants: { id: string; name: string }[];
  created_by: string;
  created_at: string;
}

export interface ScheduleExternalMeetingRequest {
  title: string;
  description?: string;
  platform: ScheduledMeetingPlatform;
  meeting_link?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  participant_ids: string[];
}

/**
 * Get all scheduled meetings for the user
 */
export const getScheduledMeetings = async (): Promise<ScheduledMeeting[]> => {
  const response = await apiClient.get('/meetings/scheduled');
  return response.data;
};

/**
 * Schedule an external meeting (Teams, Zoom, Google Meet)
 */
export const scheduleExternalMeeting = async (data: ScheduleExternalMeetingRequest): Promise<ScheduledMeeting> => {
  const response = await apiClient.post('/meetings/scheduled', data);
  return response.data;
};

/**
 * Update a scheduled meeting
 */
export const updateScheduledMeeting = async (id: string, data: Partial<ScheduleExternalMeetingRequest>): Promise<ScheduledMeeting> => {
  const response = await apiClient.put(`/meetings/scheduled/${id}`, data);
  return response.data;
};

/**
 * Delete a scheduled meeting
 */
export const deleteScheduledMeeting = async (id: string): Promise<void> => {
  await apiClient.delete(`/meetings/scheduled/${id}`);
};

export default {
  generateMeetingLink,
  validateMeetingUrl,
  createMeeting,
  getMyMeetings,
  getMeetingById,
  acceptMeeting,
  rejectMeeting,
  joinMeeting,
  leaveMeeting,
  endMeeting,
  getScheduledMeetings,
  scheduleExternalMeeting,
  updateScheduledMeeting,
  deleteScheduledMeeting,
};
