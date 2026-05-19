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
