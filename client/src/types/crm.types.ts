export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DealActivityType {
  NOTE = 'note',
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  TASK = 'task',
  STAGE_CHANGE = 'stage_change',
  STATUS_CHANGE = 'status_change',
}

export interface CrmPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  win_probability: number;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrmPipeline {
  id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  is_active: boolean;
  created_by: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  stages: CrmPipelineStage[];
  created_at: string;
  updated_at: string;
}

export interface CrmDeal {
  id: string;
  title: string;
  description?: string;
  pipeline_id: string;
  stage_id: string;
  client_id?: string;
  client?: {
    id: string;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
  };
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  value: number;
  currency: string;
  status: DealStatus;
  priority: DealPriority;
  expected_close_date?: string;
  actual_close_date?: string;
  assigned_to?: string;
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  lost_reason?: string;
  won_invoice_id?: string;
  position: number;
  created_by: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  pipeline?: CrmPipeline;
  stage?: CrmPipelineStage;
  activities?: CrmDealActivity[];
  created_at: string;
  updated_at: string;
}

export interface CrmDealActivity {
  id: string;
  deal_id: string;
  type: DealActivityType;
  title: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  is_completed: boolean;
  metadata?: Record<string, any>;
  created_by: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  deal?: CrmDeal;
  created_at: string;
  updated_at: string;
}

export interface CreateDealRequest {
  title: string;
  description?: string;
  pipeline_id: string;
  stage_id: string;
  client_id?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  value?: number;
  currency?: string;
  priority?: DealPriority;
  expected_close_date?: string;
  assigned_to?: string;
}

export interface MoveDealRequest {
  stage_id: string;
  position: number;
}

export interface DealFilters {
  status?: DealStatus;
  priority?: DealPriority;
  assigned_to?: string;
  search?: string;
}

export interface DealStatistics {
  total_deals: number;
  open_deals: number;
  won_deals: number;
  lost_deals: number;
  total_value: number;
  won_value: number;
  avg_deal_size: number;
  deals_by_stage: {
    stage_name: string;
    stage_color: string;
    count: number;
    value: number;
  }[];
}

export interface RevenueForecast {
  month: string;
  weighted_value: number;
  total_value: number;
  deal_count: number;
}

export interface ConversionRate {
  stage_name: string;
  stage_color: string;
  deal_count: number;
  conversion_rate: number;
}

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface CreateStageRequest {
  name: string;
  color?: string;
  win_probability?: number;
  is_won_stage?: boolean;
  is_lost_stage?: boolean;
}

export interface CreateActivityRequest {
  type: DealActivityType;
  title: string;
  description?: string;
  scheduled_at?: string;
}

export const DEAL_PRIORITY_LABELS: Record<DealPriority, string> = {
  [DealPriority.LOW]: 'Niski',
  [DealPriority.MEDIUM]: 'Średni',
  [DealPriority.HIGH]: 'Wysoki',
  [DealPriority.CRITICAL]: 'Krytyczny',
};

export const DEAL_PRIORITY_COLORS: Record<DealPriority, string> = {
  [DealPriority.LOW]: '#6B7280',
  [DealPriority.MEDIUM]: '#3B82F6',
  [DealPriority.HIGH]: '#F59E0B',
  [DealPriority.CRITICAL]: '#EF4444',
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  [DealStatus.OPEN]: 'Otwarty',
  [DealStatus.WON]: 'Wygrany',
  [DealStatus.LOST]: 'Przegrany',
};

export const ACTIVITY_TYPE_LABELS: Record<DealActivityType, string> = {
  [DealActivityType.NOTE]: 'Notatka',
  [DealActivityType.CALL]: 'Telefon',
  [DealActivityType.MEETING]: 'Spotkanie',
  [DealActivityType.EMAIL]: 'Email',
  [DealActivityType.TASK]: 'Zadanie',
  [DealActivityType.STAGE_CHANGE]: 'Zmiana etapu',
  [DealActivityType.STATUS_CHANGE]: 'Zmiana statusu',
};
