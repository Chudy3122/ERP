import apiClient from './axios-config';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  User,
} from '../types/auth.types';
import { ApiResponse } from '../types/api.types';

/**
 * Login user
 */
export const loginApi = async (credentials: LoginRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
  return response.data.data!;
};

/**
 * Register new user
 */
export const registerApi = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);
  return response.data.data!;
};

/**
 * Refresh access token
 */
export const refreshTokenApi = async (data: RefreshTokenRequest): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/refresh', data);
  return response.data.data!;
};

/**
 * Logout user
 */
export const logoutApi = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/auth/logout', { refreshToken });
};

/**
 * Get current user profile
 */
export const getCurrentUserApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/auth/me');
  return response.data.data!;
};
