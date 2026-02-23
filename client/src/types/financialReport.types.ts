export interface RevenueOverTimeData {
  period: string;
  net_total: number;
  gross_total: number;
  paid_amount: number;
  invoice_count: number;
}

export interface RevenueByClientData {
  client_id: string;
  client_name: string;
  total_gross: number;
  total_paid: number;
  invoice_count: number;
}

export interface StatusDistributionData {
  status: string;
  count: number;
  total_gross: number;
}

export interface PaymentOverviewData {
  total_invoices: number;
  total_gross: number;
  total_paid: number;
  total_pending: number;
  paid_percentage: number;
  overdue_count: number;
  overdue_amount: number;
}

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  period?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Szkic',
  pending: 'Oczekująca',
  sent: 'Wysłana',
  paid: 'Opłacona',
  partially_paid: 'Częściowo opłacona',
  overdue: 'Przeterminowana',
  cancelled: 'Anulowana',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: '#9CA3AF',
  pending: '#F59E0B',
  sent: '#3B82F6',
  paid: '#10B981',
  partially_paid: '#8B5CF6',
  overdue: '#EF4444',
  cancelled: '#6B7280',
};
