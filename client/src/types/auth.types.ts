export enum UserRole {
  ADMIN = 'admin',
  TEAM_LEADER = 'team_leader',
  EMPLOYEE = 'employee',
  KSIEGOWOSC = 'ksiegowosc',
  SZEF = 'szef',
  RECEPCJA = 'recepcja',
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department: string | null;
  department_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login: string | null;
  // Employee fields
  employee_id: string | null;
  position: string | null;
  hire_date: string | null;
  contract_type: string | null;
  manager_id: string | null;
  working_hours_per_day: number;
  annual_leave_days: number;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department?: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
