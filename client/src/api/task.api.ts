import { client } from './client';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStatus } from '../types/task.types';

export const getTasks = async (filters?: any): Promise<Task[]> => {
  const response = await client.get('/tasks', { params: filters });
  return response.data;
};

export const getTaskById = async (id: string): Promise<Task> => {
  const response = await client.get(`/tasks/${id}`);
  return response.data;
};

export const getMyTasks = async (filters?: any): Promise<Task[]> => {
  const response = await client.get('/tasks/my', { params: filters });
  return response.data;
};

export const getUpcomingDeadlines = async (days: number): Promise<Task[]> => {
  const response = await client.get('/tasks/upcoming-deadlines', { params: { days } });
  return response.data;
};

export const getTasksDueToday = async (): Promise<Task[]> => {
  const response = await client.get('/tasks/due-today');
  return response.data;
};

export const getTasksDueTomorrow = async (): Promise<Task[]> => {
  const response = await client.get('/tasks/due-tomorrow');
  return response.data;
};

export const getProjectTasks = async (projectId: string, filters?: any): Promise<Task[]> => {
  const response = await client.get(`/tasks/project/${projectId}`, { params: filters });
  return response.data;
};

export const getTasksGroupedByStatus = async (projectId: string): Promise<Record<TaskStatus, Task[]>> => {
  const response = await client.get(`/tasks/project/${projectId}/kanban`);
  return response.data;
};

export const createTask = async (data: CreateTaskRequest): Promise<Task> => {
  const response = await client.post('/tasks', data);
  return response.data;
};

export const updateTask = async (id: string, data: UpdateTaskRequest): Promise<Task> => {
  const response = await client.put(`/tasks/${id}`, data);
  return response.data;
};

export const assignTask = async (taskId: string, userId: string): Promise<Task> => {
  const response = await client.put(`/tasks/${taskId}/assign`, { userId });
  return response.data;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus): Promise<Task> => {
  const response = await client.put(`/tasks/${taskId}/status`, { status });
  return response.data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await client.delete(`/tasks/${id}`);
};
