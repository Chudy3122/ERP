import { client } from './client';
import { Procedure, CreateProcedureRequest, UpdateProcedureRequest } from '../types/procedure.types';

export const getProcedures = async (category?: string, status?: string): Promise<Procedure[]> => {
  const response = await client.get('/procedures', { params: { category, status } });
  return response.data;
};

export const getProcedureById = async (id: string): Promise<Procedure> => {
  const response = await client.get(`/procedures/${id}`);
  return response.data;
};

export const createProcedure = async (data: CreateProcedureRequest): Promise<Procedure> => {
  const response = await client.post('/procedures', data);
  return response.data;
};

export const updateProcedure = async (id: string, data: UpdateProcedureRequest): Promise<Procedure> => {
  const response = await client.put(`/procedures/${id}`, data);
  return response.data;
};

export const deleteProcedure = async (id: string): Promise<void> => {
  await client.delete(`/procedures/${id}`);
};

export const uploadProcedureAttachments = async (id: string, files: File[]): Promise<Procedure> => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const response = await client.post(`/procedures/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProcedureAttachment = async (id: string, url: string): Promise<Procedure> => {
  const response = await client.delete(`/procedures/${id}/attachments`, { data: { url } });
  return response.data;
};
