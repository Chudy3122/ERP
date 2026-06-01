import { client } from './client';
import { PersonalTask, CreatePersonalTask, PersonalTaskStatus } from '../types/personalTask.types';

export const getPersonalTasks = async (): Promise<PersonalTask[]> => {
  const response = await client.get('/personal-tasks');
  return response.data;
};

export const createPersonalTask = async (data: CreatePersonalTask): Promise<PersonalTask> => {
  const response = await client.post('/personal-tasks', data);
  return response.data;
};

export const updatePersonalTask = async (
  id: string,
  data: Partial<{ title: string; description: string; status: PersonalTaskStatus; order_index: number }>,
): Promise<PersonalTask> => {
  const response = await client.put(`/personal-tasks/${id}`, data);
  return response.data;
};

export const deletePersonalTask = async (id: string): Promise<void> => {
  await client.delete(`/personal-tasks/${id}`);
};

export const reorderPersonalTasks = async (orderedIds: string[]): Promise<void> => {
  await client.put('/personal-tasks/reorder', { orderedIds });
};
