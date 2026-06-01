export type SupplyStatus = 'pending' | 'approved' | 'rejected';
export type SupplyCategory = 'office' | 'equipment' | 'other';
export type SupplyPriority = 'low' | 'medium' | 'high';

export interface SupplyRequest {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  category: SupplyCategory;
  priority: SupplyPriority;
  description: string | null;
  status: SupplyStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string; avatar_url: string | null; department: string | null };
  reviewer?: { id: string; first_name: string; last_name: string } | null;
}

export interface CreateSupplyRequest {
  item_name: string;
  quantity: number;
  category: SupplyCategory;
  priority: SupplyPriority;
  description?: string;
}

export const SUPPLY_CATEGORY_LABELS: Record<SupplyCategory, string> = {
  office: 'Artykuły biurowe',
  equipment: 'Sprzęt',
  other: 'Inne',
};

export const SUPPLY_PRIORITY_LABELS: Record<SupplyPriority, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
};
