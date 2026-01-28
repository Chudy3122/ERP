export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string | null;
  phone: string | null;
  position: string | null;
  employee_id: string | null;
  hire_date: string | null;
  contract_type: string | null;
  manager_id: string | null;
  working_hours_per_day: number;
  annual_leave_days: number;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  timeEntries: {
    total: number;
    today: number;
    thisWeek: number;
  };
  leaveRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  channels: {
    total: number;
    active: number;
  };
  messages: {
    total: number;
    today: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
}

export interface UserActivity {
  timeEntries: number;
  totalHoursWorked: number;
  leaveRequests: number;
  messagesSent: number;
  lastLogin: string | null;
  accountCreated: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  department?: string;
  phone?: string;
  position?: string;
  employee_id?: string;
  hire_date?: string;
  contract_type?: string;
  manager_id?: string;
  working_hours_per_day?: number;
  annual_leave_days?: number;
  isActive?: boolean;
}
