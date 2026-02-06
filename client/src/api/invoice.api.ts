import { client } from './client';
import {
  Invoice,
  InvoiceItem,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceItemRequest,
  UpdateInvoiceItemRequest,
  InvoiceFilters,
  InvoiceStatistics,
  InvoiceStatus,
} from '../types/invoice.types';

export const getInvoices = async (filters?: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }> => {
  const response = await client.get('/invoices', { params: filters });
  return response.data;
};

export const getInvoiceStatistics = async (filters?: { start_date?: string; end_date?: string }): Promise<InvoiceStatistics> => {
  const response = await client.get('/invoices/statistics', { params: filters });
  return response.data;
};

export const getInvoiceById = async (id: string): Promise<Invoice> => {
  const response = await client.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data: CreateInvoiceRequest): Promise<Invoice> => {
  const response = await client.post('/invoices', data);
  return response.data;
};

export const updateInvoice = async (id: string, data: UpdateInvoiceRequest): Promise<Invoice> => {
  const response = await client.put(`/invoices/${id}`, data);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  await client.delete(`/invoices/${id}`);
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus): Promise<Invoice> => {
  const response = await client.patch(`/invoices/${id}/status`, { status });
  return response.data;
};

export const markInvoiceAsPaid = async (id: string, paidAmount?: number): Promise<Invoice> => {
  const response = await client.post(`/invoices/${id}/mark-paid`, { paid_amount: paidAmount });
  return response.data;
};

// Invoice Items API

export const getInvoiceItems = async (invoiceId: string): Promise<InvoiceItem[]> => {
  const response = await client.get(`/invoices/${invoiceId}/items`);
  return response.data;
};

export const addInvoiceItem = async (invoiceId: string, data: CreateInvoiceItemRequest): Promise<InvoiceItem> => {
  const response = await client.post(`/invoices/${invoiceId}/items`, data);
  return response.data;
};

export const updateInvoiceItem = async (
  invoiceId: string,
  itemId: string,
  data: UpdateInvoiceItemRequest
): Promise<InvoiceItem> => {
  const response = await client.put(`/invoices/${invoiceId}/items/${itemId}`, data);
  return response.data;
};

export const removeInvoiceItem = async (invoiceId: string, itemId: string): Promise<void> => {
  await client.delete(`/invoices/${invoiceId}/items/${itemId}`);
};

// PDF Download
export const downloadInvoicePdf = async (invoiceId: string, invoiceNumber: string): Promise<void> => {
  const response = await client.get(`/invoices/${invoiceId}/pdf`, {
    responseType: 'blob',
  });

  // Create blob link to download
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${invoiceNumber.replace(/\//g, '-')}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
