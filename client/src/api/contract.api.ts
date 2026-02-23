import { client } from './client';
import {
  Contract,
  ContractAttachment,
  CreateContractRequest,
  UpdateContractRequest,
  ContractFilters,
  ContractStatistics,
  ContractStatus,
} from '../types/contract.types';

export const createContract = async (data: CreateContractRequest): Promise<Contract> => {
  const response = await client.post('/contracts', data);
  return response.data;
};

export const getAllContracts = async (filters?: ContractFilters): Promise<Contract[]> => {
  const response = await client.get('/contracts', { params: filters });
  return response.data;
};

export const getContractById = async (id: string): Promise<Contract> => {
  const response = await client.get(`/contracts/${id}`);
  return response.data;
};

export const updateContract = async (id: string, data: UpdateContractRequest): Promise<Contract> => {
  const response = await client.put(`/contracts/${id}`, data);
  return response.data;
};

export const deleteContract = async (id: string): Promise<void> => {
  await client.delete(`/contracts/${id}`);
};

export const updateContractStatus = async (id: string, status: ContractStatus): Promise<Contract> => {
  const response = await client.patch(`/contracts/${id}/status`, { status });
  return response.data;
};

export const getContractStatistics = async (): Promise<ContractStatistics> => {
  const response = await client.get('/contracts/statistics');
  return response.data;
};

export const getExpiringContracts = async (days?: number): Promise<Contract[]> => {
  const response = await client.get('/contracts/expiring', { params: { days } });
  return response.data;
};

export const downloadContractPdf = async (id: string): Promise<Blob> => {
  const response = await client.get(`/contracts/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

// Attachments
export const getContractAttachments = async (contractId: string): Promise<ContractAttachment[]> => {
  const response = await client.get(`/contracts/${contractId}/attachments`);
  return response.data;
};

export const uploadContractAttachment = async (
  contractId: string,
  file: File
): Promise<ContractAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/contracts/${contractId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteContractAttachment = async (
  contractId: string,
  attachmentId: string
): Promise<void> => {
  await client.delete(`/contracts/${contractId}/attachments/${attachmentId}`);
};

export const sendExpiringNotifications = async (): Promise<{ message: string; count: number }> => {
  const response = await client.post('/contracts/send-expiring-notifications');
  return response.data;
};
