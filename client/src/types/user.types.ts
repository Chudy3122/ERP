export enum UserRole {
  ADMIN = 'admin',
  TEAM_LEADER = 'team_leader',
  EMPLOYEE = 'employee',
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  is_active: boolean;
  last_login?: string | null;
  employee_id?: string | null;
  position?: string | null;
  hire_date?: string | null;
  contract_type?: string | null;
  manager_id?: string | null;
  manager?: User | null;
  working_hours_per_day?: number;
  annual_leave_days?: number;
  created_at: string;
  updated_at: string;
}

export interface AuthUser extends User {
  token?: string;
}
