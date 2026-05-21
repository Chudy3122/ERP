import { client } from './client';
import { BossCalendarEntry, CreateEntryPayload } from '../types/boss-calendar.types';

export const getEntries = async (from: string, to: string): Promise<BossCalendarEntry[]> => {
  const response = await client.get('/boss-calendar', { params: { from, to } });
  return response.data;
};

export const createEntry = async (data: CreateEntryPayload): Promise<BossCalendarEntry> => {
  const response = await client.post('/boss-calendar', data);
  return response.data;
};

export const updateEntry = async (id: string, data: Partial<CreateEntryPayload>): Promise<BossCalendarEntry> => {
  const response = await client.put(`/boss-calendar/${id}`, data);
  return response.data;
};

export const deleteEntry = async (id: string): Promise<void> => {
  await client.delete(`/boss-calendar/${id}`);
};
