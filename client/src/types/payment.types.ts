import { User } from './auth.types';
import { Invoice } from './invoice.types';

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CARD = 'card',
  OTHER = 'other',
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  created_by: string;
  invoice?: Invoice;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequest {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface UpdatePaymentRequest {
  amount?: number;
  payment_date?: string;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

export interface OverdueInvoice extends Invoice {
  days_overdue: number;
  remaining_amount: number;
}

export interface PaymentStatistics {
  total_payments: number;
  total_amount: number;
  by_method: {
    method: PaymentMethod;
    count: number;
    amount: number;
  }[];
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.BANK_TRANSFER]: 'Przelew bankowy',
  [PaymentMethod.CASH]: 'Gotówka',
  [PaymentMethod.CARD]: 'Karta',
  [PaymentMethod.OTHER]: 'Inne',
};
