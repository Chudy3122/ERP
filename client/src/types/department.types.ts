import type { User } from './auth.types';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  head_id: string | null;
  head?: User | null;
  parent?: Department | null;
  order_index: number;
  is_active: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
  children?: Department[];
  employees?: User[];
}

export interface DepartmentTreeNode extends Department {
  children: DepartmentTreeNode[];
  employeeCount: number;
  level: number;
}

export interface OrgChartNode {
  id: string;
  type: 'department' | 'employee';
  name: string;
  title?: string;
  avatar_url?: string;
  department?: string;
  color?: string;
  children: OrgChartNode[];
  employeeCount?: number;
  isHead?: boolean;
}

export interface CreateDepartmentData {
  name: string;
  code: string;
  description?: string;
  parent_id?: string;
  head_id?: string;
  color?: string;
  order_index?: number;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  parent_id?: string | null;
  head_id?: string | null;
  color?: string | null;
  is_active?: boolean;
  order_index?: number;
}

export interface EmployeeHierarchy {
  user: User;
  manager: User | null;
  directReports: User[];
  department: Department | null;
}
