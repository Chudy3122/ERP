import { client } from './client';
import {
  Ticket,
  TicketComment,
  TicketAttachment,
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

// Attachment API
export const uploadTicketAttachments = async (
  ticketId: string,
  files: File[]
): Promise<TicketAttachment[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await client.post(`/tickets/${ticketId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getTicketAttachments = async (ticketId: string): Promise<TicketAttachment[]> => {
  const response = await client.get(`/tickets/${ticketId}/attachments`);
  return response.data;
};

export const deleteTicketAttachment = async (
  ticketId: string,
  attachmentId: string
): Promise<void> => {
  await client.delete(`/tickets/${ticketId}/attachments/${attachmentId}`);
};
