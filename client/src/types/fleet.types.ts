export type VehicleRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Vehicle {
  id: string;
  name: string;
  registration: string | null;
  year: number | null;
  seats: number | null;
  fuel_type: string | null;
  notes: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface VehicleInput {
  name: string;
  registration?: string;
  year?: number | null;
  seats?: number | null;
  fuel_type?: string;
  notes?: string;
  image?: File | null;
}

export interface VehicleRequest {
  id: string;
  user_id: string;
  destination: string;
  purpose: string | null;
  start_at: string;
  end_at: string;
  passengers: number | null;
  status: VehicleRequestStatus;
  vehicle_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; first_name: string; last_name: string; email?: string; avatar_url?: string | null; department?: string | null };
  vehicle?: Vehicle | null;
  reviewer?: { id: string; first_name: string; last_name: string } | null;
}

export interface CreateVehicleRequestInput {
  destination: string;
  purpose?: string;
  start_at: string; // ISO
  end_at: string;   // ISO
  passengers?: number | null;
}

export interface FleetContext {
  canManage: boolean;
  vehicles: Vehicle[];
}

export interface VehicleReminder {
  id: string;
  vehicle_id: string;
  title: string;
  due_date: string;
  remind_days_before: number;
  notes: string | null;
  reminded_at: string | null;
  created_at: string;
}

export interface VehicleReminderInput {
  title: string;
  due_date: string;
  remind_days_before?: number;
  notes?: string;
}

export type VehicleLogCategory = 'repair' | 'service' | 'expense' | 'other';

export interface VehicleLogEntry {
  id: string;
  vehicle_id: string;
  entry_date: string;
  title: string;
  category: string;
  cost: number | string | null;
  mileage: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  creator?: { id: string; first_name: string; last_name: string } | null;
}

export interface VehicleLogInput {
  entry_date: string;
  title: string;
  category?: string;
  cost?: number | null;
  mileage?: number | null;
  notes?: string;
}

export const LOG_CATEGORY_LABELS: Record<string, string> = {
  repair: 'Naprawa',
  service: 'Serwis',
  expense: 'Wydatek',
  other: 'Inne',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleRequestStatus, string> = {
  pending: 'Oczekuje',
  approved: 'Przydzielony',
  rejected: 'Odrzucone',
};
