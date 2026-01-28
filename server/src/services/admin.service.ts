import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.model';
import { TimeEntry } from '../models/TimeEntry.model';
import { LeaveRequest, LeaveStatus } from '../models/LeaveRequest.model';
import { Channel } from '../models/Channel.model';
import { Message } from '../models/Message.model';
import { Notification } from '../models/Notification.model';
import { UserStatus, StatusType } from '../models/UserStatus.model';
import * as bcrypt from 'bcrypt';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department?: string;
  phone?: string;
}

interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
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

class AdminService {
  private userRepository = AppDataSource.getRepository(User);
  private timeEntryRepository = AppDataSource.getRepository(TimeEntry);
  private leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);
  private channelRepository = AppDataSource.getRepository(Channel);
  private messageRepository = AppDataSource.getRepository(Message);
  private notificationRepository = AppDataSource.getRepository(Notification);
  private userStatusRepository = AppDataSource.getRepository(UserStatus);

  /**
   * Get all users with pagination
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: UserRole
  ): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.first_name',
        'user.last_name',
        'user.role',
        'user.department',
        'user.phone',
        'user.is_active',
        'user.last_login',
        'user.created_at',
      ])
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.where(
        '(user.email ILIKE :search OR user.first_name ILIKE :search OR user.last_name ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    const [users, total] = await queryBuilder.getManyAndCount();

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user by ID (admin view)
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'department',
        'phone',
        'position',
        'employee_id',
        'hire_date',
        'contract_type',
        'manager_id',
        'working_hours_per_day',
        'annual_leave_days',
        'avatar_url',
        'is_active',
        'last_login',
        'created_at',
        'updated_at',
      ],
    });
  }

  /**
   * Create new user (admin)
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = this.userRepository.create({
      email: data.email,
      password_hash: hashedPassword,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      department: data.department,
      phone: data.phone,
      is_active: true,
    });

    await this.userRepository.save(user);

    // Return user without password
    const result = await this.getUserById(user.id);
    if (!result) {
      throw new Error('Failed to load user after creation');
    }
    return result;
  }

  /**
   * Update user (admin)
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return null;
    }

    // Check email uniqueness if changing email
    if (data.email && data.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }
    }

    // Update fields
    if (data.email) user.email = data.email;
    if (data.firstName) user.first_name = data.firstName;
    if (data.lastName) user.last_name = data.lastName;
    if (data.role) user.role = data.role;
    if (data.department !== undefined) user.department = data.department || null;
    if (data.phone !== undefined) user.phone = data.phone || null;
    if (data.position !== undefined) user.position = data.position || null;
    if (data.employee_id !== undefined) user.employee_id = data.employee_id || null;
    if (data.hire_date !== undefined) user.hire_date = data.hire_date ? new Date(data.hire_date) : null;
    if (data.contract_type !== undefined) user.contract_type = data.contract_type || null;
    if (data.manager_id !== undefined) user.manager_id = data.manager_id || null;
    if (data.working_hours_per_day !== undefined) user.working_hours_per_day = data.working_hours_per_day;
    if (data.annual_leave_days !== undefined) user.annual_leave_days = data.annual_leave_days;
    if (data.isActive !== undefined) user.is_active = data.isActive;

    await this.userRepository.save(user);

    return this.getUserById(userId);
  }

  /**
   * Delete user (admin)
   */
  async deleteUser(userId: string): Promise<boolean> {
    const result = await this.userRepository.delete(userId);
    return (result.affected || 0) > 0;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<User | null> {
    return this.updateUser(userId, { isActive: false });
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<User | null> {
    return this.updateUser(userId, { isActive: true });
  }

  /**
   * Reset user password (admin)
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      return false;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password_hash = hashedPassword;

    await this.userRepository.save(user);
    return true;
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    users: { total: number; active: number; byRole: Record<string, number> };
    timeEntries: { total: number; today: number; thisWeek: number };
    leaveRequests: { total: number; pending: number; approved: number; rejected: number };
    channels: { total: number; active: number };
    messages: { total: number; today: number };
    notifications: { total: number; unread: number };
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    // User stats
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { is_active: true } });

    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    const roleStats: Record<string, number> = {};
    usersByRole.forEach((row) => {
      roleStats[row.role] = parseInt(row.count);
    });

    // Time entry stats
    const totalTimeEntries = await this.timeEntryRepository.count();
    const todayTimeEntries = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.clock_in >= :today', { today })
      .getCount();

    const weekTimeEntries = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.clock_in >= :weekStart', { weekStart })
      .getCount();

    // Leave request stats
    const totalLeaveRequests = await this.leaveRequestRepository.count();
    const pendingLeaveRequests = await this.leaveRequestRepository.count({
      where: { status: LeaveStatus.PENDING },
    });
    const approvedLeaveRequests = await this.leaveRequestRepository.count({
      where: { status: LeaveStatus.APPROVED },
    });
    const rejectedLeaveRequests = await this.leaveRequestRepository.count({
      where: { status: LeaveStatus.REJECTED },
    });

    // Channel stats
    const totalChannels = await this.channelRepository.count();
    const activeChannels = await this.channelRepository
      .createQueryBuilder('channel')
      .where('channel.last_message_at >= :weekStart', { weekStart })
      .getCount();

    // Message stats
    const totalMessages = await this.messageRepository.count();
    const todayMessages = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.created_at >= :today', { today })
      .getCount();

    // Notification stats
    const totalNotifications = await this.notificationRepository.count();
    const unreadNotifications = await this.notificationRepository.count({
      where: { is_read: false },
    });

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        byRole: roleStats,
      },
      timeEntries: {
        total: totalTimeEntries,
        today: todayTimeEntries,
        thisWeek: weekTimeEntries,
      },
      leaveRequests: {
        total: totalLeaveRequests,
        pending: pendingLeaveRequests,
        approved: approvedLeaveRequests,
        rejected: rejectedLeaveRequests,
      },
      channels: {
        total: totalChannels,
        active: activeChannels,
      },
      messages: {
        total: totalMessages,
        today: todayMessages,
      },
      notifications: {
        total: totalNotifications,
        unread: unreadNotifications,
      },
    };
  }

  /**
   * Get user activity stats
   */
  async getUserActivity(userId: string): Promise<{
    timeEntries: number;
    totalHoursWorked: number;
    leaveRequests: number;
    messagesSent: number;
    lastLogin: Date | null;
    accountCreated: Date;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const timeEntriesCount = await this.timeEntryRepository.count({
      where: { user_id: userId },
    });

    // Calculate total hours worked
    const timeEntries = await this.timeEntryRepository.find({
      where: { user_id: userId },
      select: ['duration_minutes'],
    });

    const totalMinutes = timeEntries.reduce(
      (sum, entry) => sum + (entry.duration_minutes || 0),
      0
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const leaveRequestsCount = await this.leaveRequestRepository.count({
      where: { user_id: userId },
    });

    const messagesSent = await this.messageRepository.count({
      where: { sender_id: userId },
    });

    return {
      timeEntries: timeEntriesCount,
      totalHoursWorked: totalHours,
      leaveRequests: leaveRequestsCount,
      messagesSent,
      lastLogin: user.last_login,
      accountCreated: user.created_at,
    };
  }

  /**
   * Get recent user registrations
   */
  async getRecentRegistrations(limit: number = 10): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount(): Promise<number> {
    return this.userStatusRepository.count({
      where: { status: StatusType.ONLINE },
    });
  }
}

export default new AdminService();
