export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface ApiError {
  error: string;
  message: string;
}
