import { client } from './client';
import { SupplyRequest, CreateSupplyRequest, SupplyComment } from '../types/supply.types';

export const getSupplyComments = async (id: string): Promise<SupplyComment[]> => {
  const response = await client.get(`/supply/${id}/comments`);
  return response.data;
};

export const addSupplyComment = async (id: string, content: string): Promise<SupplyComment> => {
  const response = await client.post(`/supply/${id}/comments`, { content });
  return response.data;
};

export const getSupplyRequests = async (status?: string): Promise<SupplyRequest[]> => {
  const response = await client.get('/supply', { params: { status } });
  return response.data;
};

export const getMySupplyRequests = async (): Promise<SupplyRequest[]> => {
  const response = await client.get('/supply/mine');
  return response.data;
};

export const createSupplyRequest = async (data: CreateSupplyRequest): Promise<SupplyRequest> => {
  const response = await client.post('/supply', data);
  return response.data;
};

export const updateSupplyRequest = async (id: string, data: CreateSupplyRequest): Promise<SupplyRequest> => {
  const response = await client.put(`/supply/${id}`, data);
  return response.data;
};

export const approveSupplyRequest = async (id: string, notes?: string): Promise<SupplyRequest> => {
  const response = await client.put(`/supply/${id}/approve`, { notes });
  return response.data;
};

export const rejectSupplyRequest = async (id: string, notes?: string): Promise<SupplyRequest> => {
  const response = await client.put(`/supply/${id}/reject`, { notes });
  return response.data;
};

export const deleteSupplyRequest = async (id: string): Promise<void> => {
  await client.delete(`/supply/${id}`);
};
