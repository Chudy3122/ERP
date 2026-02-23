import { client } from './client';
import {
  RevenueOverTimeData,
  RevenueByClientData,
  StatusDistributionData,
  PaymentOverviewData,
  ReportFilters,
} from '../types/financialReport.types';

export const getRevenueOverTime = async (
  filters: ReportFilters = {}
): Promise<RevenueOverTimeData[]> => {
  const response = await client.get('/invoices/reports/revenue-over-time', { params: filters });
  return response.data;
};

export const getRevenueByClient = async (
  filters: ReportFilters = {}
): Promise<RevenueByClientData[]> => {
  const response = await client.get('/invoices/reports/revenue-by-client', { params: filters });
  return response.data;
};

export const getStatusDistribution = async (
  filters: ReportFilters = {}
): Promise<StatusDistributionData[]> => {
  const response = await client.get('/invoices/reports/status-distribution', { params: filters });
  return response.data;
};

export const getPaymentOverview = async (
  filters: ReportFilters = {}
): Promise<PaymentOverviewData> => {
  const response = await client.get('/invoices/reports/payment-overview', { params: filters });
  return response.data;
};

export const exportExcel = async (filters: ReportFilters = {}): Promise<Blob> => {
  const response = await client.get('/invoices/reports/export/excel', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};

export const exportPdf = async (filters: ReportFilters = {}): Promise<Blob> => {
  const response = await client.get('/invoices/reports/export/pdf', {
    params: filters,
    responseType: 'blob',
  });
  return response.data;
};
