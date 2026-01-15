import { client } from './client';
import { ActivityLog } from '../types/activity.types';

export const getRecentActivities = async (limit: number = 50): Promise<ActivityLog[]> => {
  const response = await client.get('/activities/recent', { params: { limit } });
  return response.data;
};

export const getMyActivities = async (limit: number = 100): Promise<ActivityLog[]> => {
  const response = await client.get('/activities/my', { params: { limit } });
  return response.data;
};

export const getProjectActivities = async (projectId: string): Promise<ActivityLog[]> => {
  const response = await client.get(`/activities/project/${projectId}`);
  return response.data;
};

export const getActivitiesByType = async (entityType: string, limit: number = 50): Promise<ActivityLog[]> => {
  const response = await client.get(`/activities/type/${entityType}`, { params: { limit } });
  return response.data;
};

export const getActivityFeed = async (filters?: any): Promise<ActivityLog[]> => {
  const response = await client.get('/activities/feed', { params: filters });
  return response.data;
};
