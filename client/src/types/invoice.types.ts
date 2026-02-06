import { User } from './user.types';
import { Client } from './client.types';
import { Project } from './project.types';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price_net: number;
  vat_rate: number;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  client_id: string;
  project_id?: string;
  issue_date: string;
  sale_date?: string;
  due_date: string;
  payment_terms?: string;
  currency: string;
  net_total: number;
  vat_total: number;
  gross_total: number;
  paid_amount: number;
  notes?: string;
  internal_notes?: string;
  created_by: string;
  client?: Client;
  project?: Project;
  creator?: User;
  items?: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceItemRequest {
  description: string;
  quantity: number;
  unit?: string;
  unit_price_net: number;
  vat_rate?: number;
}

export interface UpdateInvoiceItemRequest {
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price_net?: number;
  vat_rate?: number;
  position?: number;
}

export interface CreateInvoiceRequest {
  client_id: string;
  project_id?: string;
  issue_date: string;
  sale_date?: string;
  due_date: string;
  payment_terms?: string;
  currency?: string;
  notes?: string;
  internal_notes?: string;
  items?: CreateInvoiceItemRequest[];
}

export interface UpdateInvoiceRequest {
  client_id?: string;
  project_id?: string;
  issue_date?: string;
  sale_date?: string;
  due_date?: string;
  payment_terms?: string;
  currency?: string;
  notes?: string;
  internal_notes?: string;
  status?: InvoiceStatus;
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  client_id?: string;
  project_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface InvoiceStatistics {
  total_count: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  partially_paid_count: number;
  overdue_count: number;
  cancelled_count: number;
  total_net: number;
  total_gross: number;
  total_paid: number;
  total_pending: number;
}
