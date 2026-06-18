import { client } from './client';
import { CalendarOccurrence, CalendarEventInput } from '../types/personalCalendar.types';

export const listEvents = async (from: Date, to: Date): Promise<CalendarOccurrence[]> => {
  const res = await client.get('/personal-calendar', {
    params: { from: from.toISOString(), to: to.toISOString() },
  });
  return res.data;
};

export const createEvent = async (input: CalendarEventInput): Promise<void> => {
  await client.post('/personal-calendar', input);
};

export const updateEvent = async (id: string, input: CalendarEventInput): Promise<void> => {
  await client.put(`/personal-calendar/${id}`, input);
};

export const deleteEvent = async (id: string): Promise<void> => {
  await client.delete(`/personal-calendar/${id}`);
};
