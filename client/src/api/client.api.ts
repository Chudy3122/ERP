import { client } from './client';
import {
  Client,
  CreateClientRequest,
  UpdateClientRequest,
  ClientFilters,
} from '../types/client.types';

export const getClients = async (filters?: ClientFilters): Promise<{ clients: Client[]; total: number }> => {
  const response = await client.get('/clients', { params: filters });
  return response.data;
};

export const getActiveClients = async (): Promise<Client[]> => {
  const response = await client.get('/clients/active');
  return response.data;
};

export const getClientById = async (id: string): Promise<Client> => {
  const response = await client.get(`/clients/${id}`);
  return response.data;
};

export const createClient = async (data: CreateClientRequest): Promise<Client> => {
  const response = await client.post('/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: UpdateClientRequest): Promise<Client> => {
  const response = await client.put(`/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<void> => {
  await client.delete(`/clients/${id}`);
};

export const checkNipExists = async (nip: string, excludeId?: string): Promise<boolean> => {
  const params = excludeId ? { excludeId } : {};
  const response = await client.get(`/clients/check-nip/${nip}`, { params });
  return response.data.exists;
};
