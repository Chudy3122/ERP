import { client } from './client';

export interface CrmParticipant {
  id: string;
  project_record_id: string;
  full_name: string;
  role: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmProjectRecord {
  id: string;
  name: string;
  info: string | null;
  created_by: string | null;
  participants: CrmParticipant[];
  created_at: string;
  updated_at: string;
}

export interface ParticipantInput {
  full_name: string;
  role?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export const listProjectRecords = async (): Promise<CrmProjectRecord[]> => {
  const res = await client.get('/crm/records');
  return res.data;
};

export const createProjectRecord = async (data: { name: string; info?: string | null }): Promise<CrmProjectRecord> => {
  const res = await client.post('/crm/records', data);
  return res.data;
};

export const updateProjectRecord = async (
  id: string,
  data: { name?: string; info?: string | null },
): Promise<CrmProjectRecord> => {
  const res = await client.put(`/crm/records/${id}`, data);
  return res.data;
};

export const deleteProjectRecord = async (id: string): Promise<void> => {
  await client.delete(`/crm/records/${id}`);
};

export const addParticipant = async (recordId: string, data: ParticipantInput): Promise<CrmParticipant> => {
  const res = await client.post(`/crm/records/${recordId}/participants`, data);
  return res.data;
};

export const updateParticipant = async (id: string, data: Partial<ParticipantInput>): Promise<CrmParticipant> => {
  const res = await client.put(`/crm/participants/${id}`, data);
  return res.data;
};

export const deleteParticipant = async (id: string): Promise<void> => {
  await client.delete(`/crm/participants/${id}`);
};
