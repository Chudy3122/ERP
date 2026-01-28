import { client } from './client';
import {
  WorkLog,
  CreateWorkLogRequest,
  UpdateWorkLogRequest,
  WorkLogFilters,
  UserTimeStats,
  ProjectTimeStats,
  DailyWorkSummary,
} from '../types/worklog.types';

// Create work log
export const createWorkLog = async (data: CreateWorkLogRequest): Promise<WorkLog> => {
  const response = await client.post('/work-logs', data);
  return response.data;
};

// Get work logs with filters
export const getWorkLogs = async (filters?: WorkLogFilters): Promise<WorkLog[]> => {
  const response = await client.get('/work-logs', { params: filters });
  return response.data;
};

// Get my work logs
export const getMyWorkLogs = async (startDate?: string, endDate?: string): Promise<WorkLog[]> => {
  const response = await client.get('/work-logs/my', {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

// Get my time stats
export const getMyTimeStats = async (startDate?: string, endDate?: string): Promise<UserTimeStats> => {
  const response = await client.get('/work-logs/my/stats', {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

// Get my daily summary
export const getMyDailySummary = async (startDate?: string, endDate?: string): Promise<DailyWorkSummary[]> => {
  const response = await client.get('/work-logs/my/daily', {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

// Get work log by ID
export const getWorkLogById = async (id: string): Promise<WorkLog> => {
  const response = await client.get(`/work-logs/${id}`);
  return response.data;
};

// Update work log
export const updateWorkLog = async (id: string, data: UpdateWorkLogRequest): Promise<WorkLog> => {
  const response = await client.put(`/work-logs/${id}`, data);
  return response.data;
};

// Delete work log
export const deleteWorkLog = async (id: string): Promise<void> => {
  await client.delete(`/work-logs/${id}`);
};

// Get task work logs
export const getTaskWorkLogs = async (taskId: string): Promise<WorkLog[]> => {
  const response = await client.get(`/tasks/${taskId}/work-logs`);
  return response.data;
};

// Get project work logs
export const getProjectWorkLogs = async (
  projectId: string,
  startDate?: string,
  endDate?: string
): Promise<WorkLog[]> => {
  const response = await client.get(`/projects/${projectId}/work-logs`, {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data;
};

// Get project time stats
export const getProjectTimeStats = async (projectId: string): Promise<ProjectTimeStats> => {
  const response = await client.get(`/projects/${projectId}/time-stats`);
  return response.data;
};
