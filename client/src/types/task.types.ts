import { User } from './user.types';
import { Project, ProjectStage } from './project.types';

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  uploaded_by?: string;
  uploader?: User;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  stage_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  created_by: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  completed_at?: string;
  parent_task_id?: string;
  order_index: number;
  project?: Project;
  stage?: ProjectStage;
  assignee?: User;
  creator?: User;
  parent?: Task;
  subtasks?: Task[];
  attachments?: TaskAttachment[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskRequest {
  project_id: string;
  stage_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: string;
  parent_task_id?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  order_index?: number;
  stage_id?: string;
}
