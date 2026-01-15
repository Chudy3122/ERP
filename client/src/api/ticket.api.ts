import { client } from './client';
import {
  Ticket,
  TicketComment,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketStatus,
  TicketStatistics,
} from '../types/ticket.types';

export const getTickets = async (filters?: any): Promise<{ tickets: Ticket[]; total: number }> => {
  const response = await client.get('/tickets', { params: filters });
  return response.data;
};

export const getTicketById = async (id: string): Promise<Ticket> => {
  const response = await client.get(`/tickets/${id}`);
  return response.data;
};

export const getMyTickets = async (): Promise<Ticket[]> => {
  const response = await client.get('/tickets/my');
  return response.data;
};

export const getAssignedTickets = async (): Promise<Ticket[]> => {
  const response = await client.get('/tickets/assigned');
  return response.data;
};

export const createTicket = async (data: CreateTicketRequest): Promise<Ticket> => {
  const response = await client.post('/tickets', data);
  return response.data;
};

export const updateTicket = async (id: string, data: UpdateTicketRequest): Promise<Ticket> => {
  const response = await client.put(`/tickets/${id}`, data);
  return response.data;
};

export const assignTicket = async (ticketId: string, userId: string): Promise<Ticket> => {
  const response = await client.put(`/tickets/${ticketId}/assign`, { userId });
  return response.data;
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<Ticket> => {
  const response = await client.put(`/tickets/${ticketId}/status`, { status });
  return response.data;
};

export const deleteTicket = async (id: string): Promise<void> => {
  await client.delete(`/tickets/${id}`);
};

export const addTicketComment = async (
  ticketId: string,
  content: string,
  isInternal: boolean = false
): Promise<TicketComment> => {
  const response = await client.post(`/tickets/${ticketId}/comments`, { content, isInternal });
  return response.data;
};

export const getTicketComments = async (ticketId: string, includeInternal: boolean = true): Promise<TicketComment[]> => {
  const response = await client.get(`/tickets/${ticketId}/comments`, {
    params: { includeInternal },
  });
  return response.data;
};

export const getTicketStatistics = async (): Promise<TicketStatistics> => {
  const response = await client.get('/tickets/statistics');
  return response.data;
};
