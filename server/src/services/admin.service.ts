import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../models/User.model';
import { Department } from '../models/Department.model';
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
  position?: string;
  phone?: string;
}

interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  department?: string;
  department_id?: string | null;
  phone?: string;
  position?: string;
  employee_id?: string;
  hire_date?: string;
  contract_type?: string;
  manager_id?: string;
  working_hours_per_day?: number;
  annual_leave_days?: number;
  isActive?: boolean;
  mobile_allowed?: boolean;
  can_edit_boss_calendar?: boolean;
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
        'user.department_id',
        'user.position',
        'user.phone',
        'user.is_active',
        'user.mobile_allowed',
        'user.can_edit_boss_calendar',
        'user.last_login',
        'user.created_at',
        'user.avatar_url',
        'user.annual_leave_days',
        'user.working_hours_per_day',
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
        'mobile_allowed',
        'can_edit_boss_calendar',
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
      position: data.position,
      phone: data.phone,
      is_active: true,
    });

    // Auto-link department_id from the chosen department name so the user
    // immediately shows up in the organization chart (which groups by department_id)
    if (data.department) {
      const dept = await AppDataSource.getRepository(Department).findOne({ where: { name: data.department } });
      if (dept) user.department_id = dept.id;
    }

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
    if (data.department !== undefined) {
      user.department = data.department || null;
      // Keep department_id in sync with the chosen name (org chart groups by department_id)
      if (data.department) {
        const dept = await AppDataSource.getRepository(Department).findOne({ where: { name: data.department } });
        user.department_id = dept ? dept.id : null;
      } else {
        user.department_id = null;
      }
    }
    if (data.department_id !== undefined) {
      user.department_id = data.department_id || null;
      if (data.department_id) {
        const dept = await AppDataSource.getRepository(Department).findOne({ where: { id: data.department_id } });
        if (dept) user.department = dept.name;
      } else {
        user.department = null;
      }
    }
    if (data.phone !== undefined) user.phone = data.phone || null;
    if (data.position !== undefined) user.position = data.position || null;
    if (data.employee_id !== undefined) user.employee_id = data.employee_id || null;
    if (data.hire_date !== undefined) user.hire_date = data.hire_date ? new Date(data.hire_date) : null;
    if (data.contract_type !== undefined) user.contract_type = data.contract_type || null;
    if (data.manager_id !== undefined) user.manager_id = data.manager_id || null;
    if (data.working_hours_per_day !== undefined) user.working_hours_per_day = data.working_hours_per_day;
    if (data.annual_leave_days !== undefined) user.annual_leave_days = data.annual_leave_days;
    if (data.isActive !== undefined) user.is_active = data.isActive;
    if (data.mobile_allowed !== undefined) user.mobile_allowed = data.mobile_allowed;
    if (data.can_edit_boss_calendar !== undefined) user.can_edit_boss_calendar = data.can_edit_boss_calendar;

    await this.userRepository.save(user);

    return this.getUserById(userId);
  }

  /**
   * Delete user (admin)
   */
  async deleteUser(userId: string, reassignToId?: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id'] });
    if (!user) return false;

    // A user is referenced by ~dozens of tables (time entries, messages, tickets,
    // work logs, notifications, …), almost all with ON DELETE NO ACTION — so a
    // plain DELETE fails on a foreign-key violation. Cascade the delete manually
    // in one transaction: for every FK pointing at the user, NULL out optional
    // references and recursively delete the rows that own them. The FK map is read
    // from the live schema so newly added tables/modules are never missed.
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      if (reassignToId && reassignToId !== userId) {
        await this.reassignBusinessRecords(runner, userId, reassignToId);
      }
      await this.cascadeDeleteReferences(runner, 'users', 'id', [userId], new Set(['users']));
      await runner.query('DELETE FROM "users" WHERE "id" = $1', [userId]);
      await runner.commitTransaction();
      return true;
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }

  /**
   * Manually cascade a delete. For every foreign key that references
   * `table(column)`, NULL out the reference when the column is nullable, or
   * recursively delete the dependent rows (and their own dependents) when it
   * isn't. Runs inside the caller's transaction. Scalar IN-lists are used (not
   * `= ANY(array)`) to avoid uuid/text array-cast ambiguity.
   */
  private async cascadeDeleteReferences(
    runner: QueryRunner,
    table: string,
    column: string,
    ids: string[],
    stack: Set<string>,
  ): Promise<void> {
    if (ids.length === 0) return;

    const fks: Array<{ child_table: string; child_col: string; nullable: string }> = await runner.query(
      `SELECT tc.table_name AS child_table, kcu.column_name AS child_col, col.is_nullable AS nullable
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         JOIN information_schema.columns col
           ON col.table_schema = tc.table_schema AND col.table_name = tc.table_name AND col.column_name = kcu.column_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_name = $1 AND ccu.column_name = $2`,
      [table, column],
    );

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');

    for (const fk of fks) {
      const child = fk.child_table;
      const childCol = fk.child_col;

      if (fk.nullable === 'YES') {
        await runner.query(`UPDATE "${child}" SET "${childCol}" = NULL WHERE "${childCol}" IN (${placeholders})`, ids);
        continue;
      }

      // Non-nullable: delete the dependent rows, but first cascade into their own
      // dependents (e.g. a message's attachments/reactions before the message).
      const pk = await this.primaryKeyColumn(runner, child);
      if (pk && !stack.has(child)) {
        const rows: Array<Record<string, string>> = await runner.query(
          `SELECT "${pk}" AS id FROM "${child}" WHERE "${childCol}" IN (${placeholders})`,
          ids,
        );
        const childIds = rows.map((r) => r.id);
        if (childIds.length) {
          await this.cascadeDeleteReferences(runner, child, pk, childIds, new Set([...stack, child]));
        }
      }
      await runner.query(`DELETE FROM "${child}" WHERE "${childCol}" IN (${placeholders})`, ids);
    }
  }

  /**
   * Hand a departing user's company records over to another user (the admin
   * performing the delete) instead of letting the cascade wipe them. Personal
   * data (time entries, messages, tickets, tasks, notifications…) is left for
   * the cascade to delete. Each pair is applied only if that column exists.
   */
  private async reassignBusinessRecords(runner: QueryRunner, fromUserId: string, toUserId: string): Promise<void> {
    const targets: Array<[string, string]> = [
      ['projects', 'created_by'], ['projects', 'owner_id'], ['projects', 'manager_id'],
      ['clients', 'created_by'], ['clients', 'assigned_to'],
      ['invoices', 'created_by'],
      ['payments', 'created_by'],
      ['contracts', 'created_by'],
      ['project_templates', 'created_by'],
    ];
    for (const [table, column] of targets) {
      const exists: unknown[] = await runner.query(
        `SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
        [table, column],
      );
      if (exists.length) {
        await runner.query(`UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`, [toUserId, fromUserId]);
      }
    }
  }

  /** First primary-key column of a table (from the live schema), or null. */
  private async primaryKeyColumn(runner: QueryRunner, table: string): Promise<string | null> {
    const rows: Array<{ column_name: string }> = await runner.query(
      `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public' AND tc.table_name = $1
        ORDER BY kcu.ordinal_position
        LIMIT 1`,
      [table],
    );
    return rows[0]?.column_name ?? null;
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

    // Channel stats — count channels that have messages this week instead
    const totalChannels = await this.channelRepository.count();
    const activeChannels = await this.messageRepository
      .createQueryBuilder('message')
      .select('COUNT(DISTINCT message.channel_id)', 'cnt')
      .where('message.created_at >= :weekStart', { weekStart })
      .getRawOne()
      .then(r => parseInt(r?.cnt ?? '0', 10));

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
