export enum TemplateTaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface ProjectTemplateStage {
  id?: string;
  template_id?: string;
  name: string;
  description?: string;
  color: string;
  position: number;
  is_completed_stage: boolean;
}

export interface ProjectTemplateTask {
  id?: string;
  template_id?: string;
  stage_position: number;
  title: string;
  description?: string;
  priority: TemplateTaskPriority;
  estimated_hours?: number;
  order_index: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  stages: ProjectTemplateStage[];
  tasks: ProjectTemplateTask[];
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  stages: Omit<ProjectTemplateStage, 'id' | 'template_id'>[];
  tasks: Omit<ProjectTemplateTask, 'id' | 'template_id'>[];
}

export interface UpdateTemplateRequest extends CreateTemplateRequest {}
