import { User } from './user.types';

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ProjectMemberRole {
  MEMBER = 'member',
  LEAD = 'lead',
  OBSERVER = 'observer',
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  code: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  budget?: number;
  created_by: string;
  manager_id?: string;
  is_archived: boolean;
  creator?: User;
  manager?: User;
  members?: ProjectMember[];
  tasks?: any[];
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  left_at?: string;
  user?: User;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  code: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date?: string;
  target_end_date?: string;
  budget?: number;
  manager_id?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  budget?: number;
  manager_id?: string;
  is_archived?: boolean;
}

export interface ProjectStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  todo_tasks: number;
  blocked_tasks: number;
  total_members: number;
  completion_percentage: number;
}
