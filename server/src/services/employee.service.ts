import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import { TimeEntry } from '../models/TimeEntry.model';
import { LeaveRequest } from '../models/LeaveRequest.model';
import activityService from './activity.service';

interface UpdateEmployeeDto {
  employee_id?: string;
  position?: string;
  hire_date?: Date;
  contract_type?: 'full_time' | 'part_time' | 'contract' | 'intern';
  manager_id?: string;
  working_hours_per_day?: number;
  annual_leave_days?: number;
  department?: string;
}

interface EmployeeFilters {
  department?: string;
  position?: string;
  role?: 'ADMIN' | 'TEAM_LEADER' | 'EMPLOYEE';
  managerId?: string;
  contractType?: string;
  search?: string;
}

export class EmployeeService {
  private userRepository = AppDataSource.getRepository(User);
  private timeEntryRepository = AppDataSource.getRepository(TimeEntry);
  private leaveRequestRepository = AppDataSource.getRepository(LeaveRequest);

  /**
   * Get employee profile with full details
   */
  async getEmployeeProfile(userId: string): Promise<User> {
    const employee = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['manager'],
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }

  /**
   * Update employee profile
   */
  async updateEmployeeProfile(userId: string, data: UpdateEmployeeDto, updatedBy: string): Promise<User> {
    const employee = await this.getEmployeeProfile(userId);

    // If employee_id is being updated, check if it's unique
    if (data.employee_id && data.employee_id !== employee.employee_id) {
      const existingEmployee = await this.userRepository.findOne({
        where: { employee_id: data.employee_id },
      });

      if (existingEmployee) {
        throw new Error('Employee ID already exists');
      }
    }

    Object.assign(employee, data);
    const updatedEmployee = await this.userRepository.save(employee);

    // Log activity
    const updater = await this.userRepository.findOne({ where: { id: updatedBy } });
    if (updater) {
      await activityService.logActivity(
        updatedBy,
        'updated_employee_profile',
        'user',
        userId,
        `${updater.first_name} ${updater.last_name} zaktualizował profil pracownika ${employee.first_name} ${employee.last_name}`,
        { changes: data }
      );
    }

    return updatedEmployee;
  }

  /**
   * Get all employees with filters
   */
  async getAllEmployees(filters?: EmployeeFilters, pagination?: { page: number; limit: number }): Promise<{ employees: User[]; total: number }> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.manager', 'manager')
      .orderBy('user.first_name', 'ASC');

    if (filters) {
      if (filters.department) {
        queryBuilder.andWhere('user.department = :department', { department: filters.department });
      }

      if (filters.position) {
        queryBuilder.andWhere('user.position ILIKE :position', { position: `%${filters.position}%` });
      }

      if (filters.role) {
        queryBuilder.andWhere('user.role = :role', { role: filters.role });
      }

      if (filters.managerId) {
        queryBuilder.andWhere('user.manager_id = :managerId', { managerId: filters.managerId });
      }

      if (filters.contractType) {
        queryBuilder.andWhere('user.contract_type = :contractType', { contractType: filters.contractType });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(user.first_name ILIKE :search OR user.last_name ILIKE :search OR user.email ILIKE :search OR user.employee_id ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }
    }

    if (pagination) {
      queryBuilder.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    const [employees, total] = await queryBuilder.getManyAndCount();

    return { employees, total };
  }

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(department: string): Promise<User[]> {
    const { employees } = await this.getAllEmployees({ department });
    return employees;
  }

  /**
   * Assign manager to employee
   */
  async assignManager(employeeId: string, managerId: string, assignedBy: string): Promise<User> {
    const employee = await this.getEmployeeProfile(employeeId);
    const manager = await this.userRepository.findOne({ where: { id: managerId } });

    if (!manager) {
      throw new Error('Manager not found');
    }

    // Prevent circular reference
    if (employeeId === managerId) {
      throw new Error('Employee cannot be their own manager');
    }

    employee.manager_id = managerId;
    const updatedEmployee = await this.userRepository.save(employee);

    // Log activity
    const assigner = await this.userRepository.findOne({ where: { id: assignedBy } });
    if (assigner) {
      await activityService.logActivity(
        assignedBy,
        'assigned_manager',
        'user',
        employeeId,
        `${assigner.first_name} ${assigner.last_name} przypisał ${manager.first_name} ${manager.last_name} jako managera dla ${employee.first_name} ${employee.last_name}`,
        { manager_id: managerId }
      );
    }

    return updatedEmployee;
  }

  /**
   * Get team members (employees managed by a user)
   */
  async getTeamMembers(managerId: string): Promise<User[]> {
    const { employees } = await this.getAllEmployees({ managerId });
    return employees;
  }

  /**
   * Get employee statistics
   */
  async getEmployeeStatistics(userId: string, year?: number, month?: number): Promise<any> {
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || new Date().getMonth() + 1;

    // Time entries stats
    const startDate = new Date(currentYear, month ? currentMonth - 1 : 0, 1);
    const endDate = month
      ? new Date(currentYear, currentMonth, 0, 23, 59, 59)
      : new Date(currentYear, 11, 31, 23, 59, 59);

    const timeEntries = await this.timeEntryRepository
      .createQueryBuilder('entry')
      .where('entry.user_id = :userId', { userId })
      .andWhere('entry.clock_in >= :startDate', { startDate })
      .andWhere('entry.clock_in <= :endDate', { endDate })
      .getMany();

    const totalMinutes = timeEntries.reduce((sum, entry) => {
      if (entry.clock_out) {
        const diff = entry.clock_out.getTime() - entry.clock_in.getTime();
        return sum + Math.floor(diff / 60000);
      }
      return sum;
    }, 0);

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Leave requests stats
    const leaveRequests = await this.leaveRequestRepository
      .createQueryBuilder('leave')
      .where('leave.user_id = :userId', { userId })
      .andWhere('leave.start_date >= :startDate', { startDate })
      .andWhere('leave.start_date <= :endDate', { endDate })
      .getMany();

    const approvedLeaves = leaveRequests.filter(l => l.status === 'approved');
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending');
    const totalLeaveDays = approvedLeaves.reduce((sum, leave) => sum + leave.days_count, 0);

    return {
      timeTracking: {
        totalHours,
        totalMinutes: remainingMinutes,
        totalDays: timeEntries.length,
        period: month ? `${currentMonth}/${currentYear}` : `${currentYear}`,
      },
      leave: {
        totalRequests: leaveRequests.length,
        approvedDays: totalLeaveDays,
        pendingRequests: pendingLeaves.length,
      },
    };
  }

  /**
   * Get employee work summary
   */
  async getEmployeeWorkSummary(userId: string): Promise<any> {
    const employee = await this.getEmployeeProfile(userId);

    // Get projects count (from project_members)
    const projectMembersRepository = AppDataSource.getRepository('ProjectMember');
    const projectCount = await projectMembersRepository
      .createQueryBuilder('pm')
      .where('pm.user_id = :userId', { userId })
      .andWhere('pm.left_at IS NULL')
      .getCount();

    // Get tasks count
    const taskRepository = AppDataSource.getRepository('Task');
    const [todoTasks, inProgressTasks, completedTasks] = await Promise.all([
      taskRepository.count({ where: { assigned_to: userId, status: 'todo' } }),
      taskRepository.count({ where: { assigned_to: userId, status: 'in_progress' } }),
      taskRepository.count({ where: { assigned_to: userId, status: 'done' } }),
    ]);

    // Get tickets count
    const ticketRepository = AppDataSource.getRepository('Ticket');
    const [openTickets, inProgressTickets, resolvedTickets] = await Promise.all([
      ticketRepository.count({ where: { assigned_to: userId, status: 'open' } }),
      ticketRepository.count({ where: { assigned_to: userId, status: 'in_progress' } }),
      ticketRepository.count({ where: { assigned_to: userId, status: 'resolved' } }),
    ]);

    return {
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: `${employee.first_name} ${employee.last_name}`,
        position: employee.position,
        department: employee.department,
        hire_date: employee.hire_date,
        manager: employee.manager ? `${employee.manager.first_name} ${employee.manager.last_name}` : null,
      },
      projects: {
        active: projectCount,
      },
      tasks: {
        todo: todoTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        total: todoTasks + inProgressTasks + completedTasks,
      },
      tickets: {
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        total: openTickets + inProgressTickets + resolvedTickets,
      },
    };
  }

  /**
   * Get employees with upcoming work anniversaries
   */
  async getUpcomingAnniversaries(days: number = 30): Promise<User[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const employees = await this.userRepository
      .createQueryBuilder('user')
      .where('user.hire_date IS NOT NULL')
      .getMany();

    // Filter employees with anniversary in next N days
    return employees.filter(employee => {
      if (!employee.hire_date) return false;

      const hireDate = new Date(employee.hire_date);
      const thisYearAnniversary = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());

      return thisYearAnniversary >= today && thisYearAnniversary <= futureDate;
    });
  }

  /**
   * Get department statistics
   */
  async getDepartmentStatistics(department?: string): Promise<any> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select('user.department', 'department')
      .addSelect('COUNT(*)', 'employee_count')
      .addSelect('user.contract_type', 'contract_type')
      .groupBy('user.department')
      .addGroupBy('user.contract_type');

    if (department) {
      queryBuilder.where('user.department = :department', { department });
    }

    const results = await queryBuilder.getRawMany();

    // Group by department
    const departmentStats: any = {};
    results.forEach(row => {
      if (!departmentStats[row.department]) {
        departmentStats[row.department] = {
          department: row.department || 'Nie przypisany',
          totalEmployees: 0,
          byContractType: {},
        };
      }
      departmentStats[row.department].totalEmployees += parseInt(row.employee_count);
      departmentStats[row.department].byContractType[row.contract_type || 'unknown'] = parseInt(row.employee_count);
    });

    return Object.values(departmentStats);
  }
}

export default new EmployeeService();
