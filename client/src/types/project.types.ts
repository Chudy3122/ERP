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

export interface ProjectStage {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  is_completed_stage: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStageRequest {
  name: string;
  description?: string;
  color?: string;
  position?: number;
  is_completed_stage?: boolean;
}

export interface UpdateStageRequest {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
  is_completed_stage?: boolean;
  is_active?: boolean;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string;
  uploader?: User;
  created_at: string;
}

export interface ProjectActivity {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata?: any;
  user?: User;
  created_at: string;
}
