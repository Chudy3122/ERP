import apiClient from './axios-config';

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  position?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  department?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  position?: string | null;
  employee_id?: string | null;
  hire_date?: string | null;
  working_hours_per_day?: number;
  annual_leave_days?: number;
  created_at?: string;
}

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/users/profile');
  return response.data.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<UserProfile> => {
  const response = await apiClient.put('/users/profile', data);
  return response.data.data;
};

/**
 * Upload avatar image
 */
export const uploadAvatar = async (file: File): Promise<{ avatar_url: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiClient.post('/users/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

/**
 * Remove avatar
 */
export const removeAvatar = async (): Promise<void> => {
  await apiClient.delete('/users/avatar');
};

/**
 * Upload cover photo
 */
export const uploadCover = async (file: File): Promise<{ cover_url: string }> => {
  const formData = new FormData();
  formData.append('cover', file);

  const response = await apiClient.post('/users/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

/**
 * Change password
 */
export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await apiClient.put('/users/password', {
    currentPassword,
    newPassword,
  });
};

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  changePassword,
};
