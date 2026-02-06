import { User } from './user.types';

export enum ClientType {
  CLIENT = 'client',
  SUPPLIER = 'supplier',
  BOTH = 'both',
}

export interface Client {
  id: string;
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_type: ClientType;
  is_active: boolean;
  notes?: string;
  created_by: string;
  creator?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateClientRequest {
  name: string;
  nip?: string;
  regon?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_type?: ClientType;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateClientRequest {
  name?: string;
  nip?: string;
  regon?: string;
  street?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  client_type?: ClientType;
  is_active?: boolean;
  notes?: string;
}

export interface ClientFilters {
  client_type?: ClientType;
  is_active?: boolean;
  search?: string;
}
