import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  AuthContextType,
  LoginRequest,
  RegisterRequest,
} from '../types/auth.types';
import { loginApi, registerApi, logoutApi, getCurrentUserApi } from '../api/auth.api';
import { toast } from 'react-toastify';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');

      if (!storedUser || !accessToken) {
        setIsLoading(false);
        return;
      }

      // Render immediately from the cached session — no white screen while the
      // backend (possibly cold-starting) responds. Validate in the background.
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        /* corrupted cache — will be replaced by the fetch below */
      }
      setIsLoading(false);

      try {
        const currentUser = await getCurrentUserApi();
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          // Token truly invalid — clear everything and force re-login
          localStorage.removeItem('user');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setUser(null);
        }
        // Network error / server sleeping — keep the cached session already set
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await loginApi(credentials);

      // Save tokens and user
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);

      toast.success('Zalogowano pomyślnie!');
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await registerApi(data);

      // Save tokens and user
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      setUser(response.user);

      toast.success('Rejestracja przebiegła pomyślnie!');
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Nie udało się zarejestrować. Spróbuj ponownie.';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear storage and state
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);

      toast.info('Wylogowano pomyślnie');
    }
  };

  const refreshToken = async () => {
    // Token refresh is handled automatically by axios interceptor
    // This function is here for manual refresh if needed
    const currentUser = await getCurrentUserApi();
    setUser(currentUser);
    localStorage.setItem('user', JSON.stringify(currentUser));
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
