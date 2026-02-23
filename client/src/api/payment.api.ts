import { client } from './client';
import {
  Payment,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  OverdueInvoice,
  PaymentStatistics,
} from '../types/payment.types';

export const createPayment = async (data: CreatePaymentRequest): Promise<Payment> => {
  const response = await client.post('/payments', data);
  return response.data;
};

export const getPaymentById = async (id: string): Promise<Payment> => {
  const response = await client.get(`/payments/${id}`);
  return response.data;
};

export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  const response = await client.get(`/payments/invoice/${invoiceId}`);
  return response.data;
};

export const updatePayment = async (id: string, data: UpdatePaymentRequest): Promise<Payment> => {
  const response = await client.put(`/payments/${id}`, data);
  return response.data;
};

export const deletePayment = async (id: string): Promise<void> => {
  await client.delete(`/payments/${id}`);
};

export const getOverdueInvoices = async (): Promise<OverdueInvoice[]> => {
  const response = await client.get('/payments/overdue');
  return response.data;
};

export const sendOverdueReminders = async (): Promise<{ message: string; count: number }> => {
  const response = await client.post('/payments/send-reminders');
  return response.data;
};

export const getPaymentStatistics = async (filters?: {
  start_date?: string;
  end_date?: string;
}): Promise<PaymentStatistics> => {
  const response = await client.get('/payments/statistics', { params: filters });
  return response.data;
};
