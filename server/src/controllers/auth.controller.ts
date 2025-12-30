import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, first_name, last_name, department, phone } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email, password, first_name, and last_name are required',
      });
    }

    // Register user
    const result = await authService.register({
      email,
      password,
      first_name,
      last_name,
      department,
      phone,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(400).json({
      error: 'Registration Failed',
      message: error instanceof Error ? error.message : 'Failed to register user',
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
    }

    // Login user
    const result = await authService.login({ email, password });

    return res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({
      error: 'Authentication Failed',
      message: error instanceof Error ? error.message : 'Invalid credentials',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    return res.status(200).json({
      message: 'Token refreshed successfully',
      data: result,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(401).json({
      error: 'Token Refresh Failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    return res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Logout Failed',
      message: error instanceof Error ? error.message : 'Failed to logout',
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      data: user,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get user profile',
    });
  }
};
