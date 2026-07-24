export enum UserRole {
  ADMIN = 'admin',
  KIEROWNIK = 'kierownik',
  EMPLOYEE = 'employee',
  KSIEGOWOSC = 'ksiegowosc',
  KADRY = 'kadry',
  SZEF = 'szef',
  SEKRETARIAT = 'sekretariat',
  PRAWNIK = 'prawnik',
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
  cover_url?: string | null;
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
  /** Individually granted the right to add/edit meetings in the boss calendar. */
  can_edit_boss_calendar?: boolean;
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
