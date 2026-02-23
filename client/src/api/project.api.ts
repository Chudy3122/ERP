import { client } from './client';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMember,
  ProjectMemberRole,
  ProjectStatistics,
  ProjectStage,
  CreateStageRequest,
  UpdateStageRequest,
  ProjectAttachment,
  ProjectActivity,
} from '../types/project.types';
import { Task } from '../types/task.types';

export const getProjects = async (filters?: any): Promise<{ projects: Project[]; total: number }> => {
  const response = await client.get('/projects', { params: filters });
  return response.data;
};

export const getProjectById = async (id: string): Promise<Project> => {
  const response = await client.get(`/projects/${id}`);
  return response.data;
};

export const getMyProjects = async (): Promise<Project[]> => {
  const response = await client.get('/projects/my');
  return response.data;
};

export const createProject = async (data: CreateProjectRequest): Promise<Project> => {
  const response = await client.post('/projects', data);
  return response.data;
};

export const updateProject = async (id: string, data: UpdateProjectRequest): Promise<Project> => {
  const response = await client.put(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await client.delete(`/projects/${id}`);
};

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const response = await client.get(`/projects/${projectId}/members`);
  return response.data;
};

export const addProjectMember = async (
  projectId: string,
  userId: string,
  role: ProjectMemberRole
): Promise<ProjectMember> => {
  const response = await client.post(`/projects/${projectId}/members`, { userId, role });
  return response.data;
};

export const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
  await client.delete(`/projects/${projectId}/members/${userId}`);
};

export const getProjectStatistics = async (projectId: string): Promise<ProjectStatistics> => {
  const response = await client.get(`/projects/${projectId}/statistics`);
  return response.data;
};

// Project Stages API

export const getProjectStages = async (projectId: string): Promise<ProjectStage[]> => {
  const response = await client.get(`/projects/${projectId}/stages`);
  return response.data.data;
};

export const createProjectStage = async (projectId: string, data: CreateStageRequest): Promise<ProjectStage> => {
  const response = await client.post(`/projects/${projectId}/stages`, data);
  return response.data.data;
};

export const updateProjectStage = async (stageId: string, data: UpdateStageRequest): Promise<ProjectStage> => {
  const response = await client.put(`/stages/${stageId}`, data);
  return response.data.data;
};

export const deleteProjectStage = async (stageId: string, moveTasksToStageId?: string): Promise<void> => {
  await client.delete(`/stages/${stageId}`, { data: { moveTasksToStageId } });
};

export const reorderProjectStages = async (projectId: string, stageIds: string[]): Promise<void> => {
  await client.post(`/projects/${projectId}/stages/reorder`, { stageIds });
};

export const createDefaultStages = async (projectId: string, templateId?: string): Promise<ProjectStage[]> => {
  const response = await client.post(`/projects/${projectId}/stages/default`, templateId ? { template_id: templateId } : {});
  return response.data.data;
};

export const getTasksByStages = async (projectId: string): Promise<{ stage: ProjectStage | null; tasks: Task[] }[]> => {
  const response = await client.get(`/projects/${projectId}/tasks-by-stages`);
  return response.data.data;
};

export const moveTaskToStage = async (taskId: string, stageId: string | null): Promise<Task> => {
  const response = await client.put(`/tasks/${taskId}/move-to-stage`, { stageId });
  return response.data.data;
};

// Project Attachments API

export const uploadProjectAttachments = async (projectId: string, files: File[]): Promise<ProjectAttachment[]> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  const response = await client.post(`/projects/${projectId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const getProjectAttachments = async (projectId: string): Promise<ProjectAttachment[]> => {
  const response = await client.get(`/projects/${projectId}/attachments`);
  return response.data.data;
};

export const deleteProjectAttachment = async (projectId: string, attachmentId: string): Promise<void> => {
  await client.delete(`/projects/${projectId}/attachments/${attachmentId}`);
};

// Project Activity API

export const getProjectActivity = async (projectId: string, limit: number = 50): Promise<ProjectActivity[]> => {
  const response = await client.get(`/projects/${projectId}/activity`, {
    params: { limit },
  });
  return response.data.data;
};
