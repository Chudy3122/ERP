import { User } from './auth.types';
import { Task } from './task.types';
import { Project } from './project.types';

export enum WorkLogType {
  REGULAR = 'regular',           // Płatny (domyślny)
  UNPAID = 'unpaid',             // Niepłatny
  OVERTIME = 'overtime',         // Nadgodziny
  OVERTIME_COMP = 'overtime_comp', // Odbiór nadgodzin
  BUSINESS_TRIP = 'business_trip', // Wyjście służbowe
  LATE = 'late',                 // Spóźnienie
}

export const WorkLogTypeLabels: Record<WorkLogType, string> = {
  [WorkLogType.REGULAR]: 'Płatny',
  [WorkLogType.UNPAID]: 'Niepłatny',
  [WorkLogType.OVERTIME]: 'Nadgodziny',
  [WorkLogType.OVERTIME_COMP]: 'Odbiór nadgodzin',
  [WorkLogType.BUSINESS_TRIP]: 'Wyjście służbowe',
  [WorkLogType.LATE]: 'Spóźnienie',
};

export interface WorkLog {
  id: string;
  user_id: string;
  task_id: string | null;
  project_id: string | null;
  work_date: string;
  hours: number;
  description: string | null;
  is_billable: boolean;
  work_type: WorkLogType;
  created_at: string;
  updated_at: string;
  user?: User;
  task?: Task;
  project?: Project;
}

export interface CreateWorkLogRequest {
  task_id?: string;
  project_id?: string;
  work_date: string;
  hours: number;
  description?: string;
  is_billable?: boolean;
  work_type?: WorkLogType;
}

export interface UpdateWorkLogRequest {
  work_date?: string;
  hours?: number;
  description?: string;
  is_billable?: boolean;
  work_type?: WorkLogType;
}

export interface WorkLogFilters {
  user_id?: string;
  task_id?: string;
  project_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface UserTimeStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  taskHours: number;
  generalHours: number;
  daysWorked: number;
  logsCount: number;
  averageHoursPerDay: number;
  byProject: Array<{
    project_id: string;
    project_name: string;
    hours: number;
  }>;
}

export interface ProjectTimeStats {
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  logsCount: number;
  byUser: Array<{
    user_id: string;
    user_name: string;
    hours: number;
  }>;
  byTask: Array<{
    task_id: string;
    task_title: string;
    hours: number;
  }>;
}

export interface DailyWorkSummary {
  date: string;
  totalHours: number;
  logs: Array<{
    id: string;
    hours: number;
    description: string | null;
    task_title: string | null;
    project_name: string | null;
  }>;
}
