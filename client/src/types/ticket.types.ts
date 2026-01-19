import { User } from './user.types';
import { Project } from './project.types';

export enum TicketType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  SUPPORT = 'support',
  QUESTION = 'question',
  OTHER = 'other',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_RESPONSE = 'waiting_response',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string;
  assigned_to?: string;
  category?: string;
  project_id?: string;
  resolved_at?: string;
  closed_at?: string;
  creator?: User;
  assignee?: User;
  project?: Project;
  created_at: string;
  updated_at: string;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  type: TicketType;
  status?: TicketStatus;
  priority: TicketPriority;
  category?: string;
  project_id?: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string;
  category?: string;
  project_id?: string;
}

export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}
