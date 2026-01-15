import { client } from './client';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectMember,
  ProjectMemberRole,
  ProjectStatistics,
} from '../types/project.types';

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
