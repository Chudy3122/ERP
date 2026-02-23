import { client } from './client';
import {
  ProjectTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from '../types/projectTemplate.types';

export const getAllTemplates = async (): Promise<ProjectTemplate[]> => {
  const response = await client.get('/project-templates');
  return response.data;
};

export const getTemplateById = async (id: string): Promise<ProjectTemplate> => {
  const response = await client.get(`/project-templates/${id}`);
  return response.data;
};

export const createTemplate = async (data: CreateTemplateRequest): Promise<ProjectTemplate> => {
  const response = await client.post('/project-templates', data);
  return response.data;
};

export const updateTemplate = async (id: string, data: UpdateTemplateRequest): Promise<ProjectTemplate> => {
  const response = await client.put(`/project-templates/${id}`, data);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await client.delete(`/project-templates/${id}`);
};
