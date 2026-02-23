import { Client } from './client.types';

export enum ContractStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  RENEWED = 'renewed',
}

export interface ContractAttachment {
  id: string;
  contract_id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string;
  uploader?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  title: string;
  description?: string;
  client_id: string;
  client?: Client;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  value?: number;
  currency: string;
  payment_terms?: string;
  auto_renew: boolean;
  renewal_notice_days: number;
  notes?: string;
  internal_notes?: string;
  created_by: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  attachments?: ContractAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CreateContractRequest {
  title: string;
  description?: string;
  client_id: string;
  start_date: string;
  end_date: string;
  value?: number;
  currency?: string;
  payment_terms?: string;
  auto_renew?: boolean;
  renewal_notice_days?: number;
  notes?: string;
  internal_notes?: string;
}

export interface UpdateContractRequest extends Partial<CreateContractRequest> {
  status?: ContractStatus;
}

export interface ContractFilters {
  status?: ContractStatus;
  client_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  expiring_within_days?: number;
}

export interface ContractStatistics {
  total: number;
  by_status: { status: string; count: number }[];
  total_value: number;
  expiring_soon: number;
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Szkic',
  [ContractStatus.PENDING]: 'Oczekująca',
  [ContractStatus.ACTIVE]: 'Aktywna',
  [ContractStatus.EXPIRED]: 'Wygasła',
  [ContractStatus.TERMINATED]: 'Rozwiązana',
  [ContractStatus.RENEWED]: 'Odnowiona',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'gray',
  [ContractStatus.PENDING]: 'amber',
  [ContractStatus.ACTIVE]: 'green',
  [ContractStatus.EXPIRED]: 'red',
  [ContractStatus.TERMINATED]: 'slate',
  [ContractStatus.RENEWED]: 'blue',
};
