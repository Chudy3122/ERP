import apiClient from './axios-config';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  status?: string;
}

export interface TimeReportSummary {
  totalHours: number;
  totalMinutes: number;
  overtimeHours: number;
  overtimeMinutes: number;
  lateArrivals: number;
  totalLateMinutes: number;
  daysWorked: number;
  averageHoursPerDay: number;
}

export interface TimeReportData {
  entries: any[];
  summary: TimeReportSummary;
}

/**
 * Get time report data
 */
export const getTimeReport = async (filters: ReportFilters): Promise<TimeReportData> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.status) params.append('status', filters.status);

  const response = await apiClient.get(`/reports/time?${params.toString()}`);
  return response.data.data;
};

/**
 * Export time report to Excel
 */
export const exportTimeReportExcel = async (filters: ReportFilters): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.status) params.append('status', filters.status);

  const response = await apiClient.get(`/reports/time/export/excel?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Export time report to PDF
 */
export const exportTimeReportPDF = async (filters: ReportFilters): Promise<Blob> => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.status) params.append('status', filters.status);

  const response = await apiClient.get(`/reports/time/export/pdf?${params.toString()}`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getTimeReport,
  exportTimeReportExcel,
  exportTimeReportPDF,
};
