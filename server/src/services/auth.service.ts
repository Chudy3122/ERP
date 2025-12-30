import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.model';
import { RefreshToken } from '../models/RefreshToken.model';
import { generateTokenPair, verifyRefreshToken, getTokenExpiration } from '../utils/jwt.utils';
import { validatePasswordStrength } from '../utils/password.utils';

export interface RegisterDTO {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Create new user
    const user = this.userRepository.create({
      email: data.email.toLowerCase(),
      password: data.password, // Will be hashed by @BeforeInsert hook
      first_name: data.first_name,
      last_name: data.last_name,
      department: data.department,
      phone: data.phone,
      role: UserRole.EMPLOYEE, // Default role
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Return user without sensitive data
    const { password_hash, password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user by email (include password_hash for verification)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: data.email.toLowerCase() })
      .addSelect('user.password_hash')
      .getOne();

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is inactive. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await user.verifyPassword(data.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    user.last_login = new Date();
    await this.userRepository.save(user);

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Return user without sensitive data
    const { password_hash, password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenString: string): Promise<AuthResponse> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshTokenString);

    // Check if refresh token exists in database and is not revoked
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
      relations: ['user'],
    });

    if (!refreshToken || !refreshToken.isValid()) {
      throw new Error('Invalid or expired refresh token');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user || !user.is_active) {
      throw new Error('User not found or inactive');
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    // Revoke old refresh token
    refreshToken.revoke();
    await this.refreshTokenRepository.save(refreshToken);

    // Save new refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Return user without sensitive data
    const { password_hash, password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshTokenString: string): Promise<void> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenString },
    });

    if (refreshToken) {
      refreshToken.revoke();
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  /**
   * Save refresh token to database
   */
  private async saveRefreshToken(userId: string, tokenString: string): Promise<void> {
    const refreshToken = this.refreshTokenRepository.create({
      user_id: userId,
      token: tokenString,
      expires_at: getTokenExpiration(),
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
  }
}
