import { Repository, Between, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { WorkLog, WorkLogType } from '../models/WorkLog.model';
import { Task } from '../models/Task.model';
import { ActivityLog } from '../models/ActivityLog.model';

interface CreateWorkLogDto {
  task_id?: string;
  project_id?: string;
  work_date: string;
  hours: number;
  description?: string;
  is_billable?: boolean;
  work_type?: WorkLogType;
}

interface UpdateWorkLogDto {
  work_date?: string;
  hours?: number;
  description?: string;
  is_billable?: boolean;
  work_type?: WorkLogType;
}

interface WorkLogFilters {
  user_id?: string;
  task_id?: string;
  project_id?: string;
  start_date?: string;
  end_date?: string;
}

export class WorkLogService {
  private workLogRepository: Repository<WorkLog>;
  private taskRepository: Repository<Task>;
  private activityLogRepository: Repository<ActivityLog>;

  constructor() {
    this.workLogRepository = AppDataSource.getRepository(WorkLog);
    this.taskRepository = AppDataSource.getRepository(Task);
    this.activityLogRepository = AppDataSource.getRepository(ActivityLog);
  }

  /**
   * Create a new work log entry
   */
  async createWorkLog(userId: string, data: CreateWorkLogDto): Promise<WorkLog> {
    // If task_id is provided, get project_id from task
    let projectId = data.project_id;
    let taskTitle = '';

    if (data.task_id) {
      const task = await this.taskRepository.findOne({
        where: { id: data.task_id },
        relations: ['project'],
      });

      if (!task) {
        throw new Error('Task not found');
      }

      projectId = task.project_id;
      taskTitle = task.title;
    }

    const workLog = this.workLogRepository.create({
      user_id: userId,
      task_id: data.task_id,
      project_id: projectId,
      work_date: new Date(data.work_date),
      hours: data.hours,
      description: data.description,
      is_billable: data.is_billable ?? false,
      work_type: data.work_type ?? WorkLogType.REGULAR,
    });

    const savedLog = await this.workLogRepository.save(workLog);

    // Update task actual_hours
    if (data.task_id) {
      await this.updateTaskActualHours(data.task_id);
    }

    // Log activity
    const description = data.task_id
      ? `Zalogowano ${data.hours}h pracy przy zadaniu "${taskTitle}"`
      : `Zalogowano ${data.hours}h pracy`;

    await this.logActivity(userId, 'logged_time', 'work_log', savedLog.id, description);

    return savedLog;
  }

  /**
   * Get work log by ID
   */
  async getWorkLogById(id: string): Promise<WorkLog | null> {
    return this.workLogRepository.findOne({
      where: { id },
      relations: ['user', 'task', 'project'],
    });
  }

  /**
   * Update work log
   */
  async updateWorkLog(id: string, userId: string, data: UpdateWorkLogDto): Promise<WorkLog> {
    const workLog = await this.workLogRepository.findOne({
      where: { id },
    });

    if (!workLog) {
      throw new Error('Work log not found');
    }

    // Only owner can update
    if (workLog.user_id !== userId) {
      throw new Error('Not authorized to update this work log');
    }

    const oldHours = workLog.hours;

    if (data.work_date) workLog.work_date = new Date(data.work_date);
    if (data.hours !== undefined) workLog.hours = data.hours;
    if (data.description !== undefined) workLog.description = data.description;
    if (data.is_billable !== undefined) workLog.is_billable = data.is_billable;
    if (data.work_type !== undefined) workLog.work_type = data.work_type;

    const updated = await this.workLogRepository.save(workLog);

    // Update task actual_hours if hours changed
    if (workLog.task_id && data.hours !== undefined && data.hours !== oldHours) {
      await this.updateTaskActualHours(workLog.task_id);
    }

    return updated;
  }

  /**
   * Delete work log
   */
  async deleteWorkLog(id: string, userId: string): Promise<void> {
    const workLog = await this.workLogRepository.findOne({
      where: { id },
    });

    if (!workLog) {
      throw new Error('Work log not found');
    }

    // Only owner can delete
    if (workLog.user_id !== userId) {
      throw new Error('Not authorized to delete this work log');
    }

    const taskId = workLog.task_id;

    await this.workLogRepository.remove(workLog);

    // Update task actual_hours
    if (taskId) {
      await this.updateTaskActualHours(taskId);
    }
  }

  /**
   * Get work logs with filters
   */
  async getWorkLogs(filters: WorkLogFilters): Promise<WorkLog[]> {
    const queryBuilder = this.workLogRepository
      .createQueryBuilder('workLog')
      .leftJoinAndSelect('workLog.user', 'user')
      .leftJoinAndSelect('workLog.task', 'task')
      .leftJoinAndSelect('workLog.project', 'project');

    if (filters.user_id) {
      queryBuilder.andWhere('workLog.user_id = :userId', { userId: filters.user_id });
    }

    if (filters.task_id) {
      queryBuilder.andWhere('workLog.task_id = :taskId', { taskId: filters.task_id });
    }

    if (filters.project_id) {
      queryBuilder.andWhere('workLog.project_id = :projectId', { projectId: filters.project_id });
    }

    if (filters.start_date && filters.end_date) {
      queryBuilder.andWhere('workLog.work_date BETWEEN :startDate AND :endDate', {
        startDate: filters.start_date,
        endDate: filters.end_date,
      });
    } else if (filters.start_date) {
      queryBuilder.andWhere('workLog.work_date >= :startDate', { startDate: filters.start_date });
    } else if (filters.end_date) {
      queryBuilder.andWhere('workLog.work_date <= :endDate', { endDate: filters.end_date });
    }

    queryBuilder.orderBy('workLog.work_date', 'DESC').addOrderBy('workLog.created_at', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Get user work logs for a date range
   */
  async getUserWorkLogs(userId: string, startDate: Date, endDate: Date): Promise<WorkLog[]> {
    return this.workLogRepository.find({
      where: {
        user_id: userId,
        work_date: Between(startDate, endDate),
      },
      relations: ['task', 'project'],
      order: { work_date: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * Get task work logs
   */
  async getTaskWorkLogs(taskId: string): Promise<WorkLog[]> {
    return this.workLogRepository.find({
      where: { task_id: taskId },
      relations: ['user'],
      order: { work_date: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * Get project work logs
   */
  async getProjectWorkLogs(projectId: string, startDate?: Date, endDate?: Date): Promise<WorkLog[]> {
    const where: any = { project_id: projectId };

    if (startDate && endDate) {
      where.work_date = Between(startDate, endDate);
    }

    return this.workLogRepository.find({
      where,
      relations: ['user', 'task'],
      order: { work_date: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * Get user time stats for a period
   */
  async getUserTimeStats(userId: string, startDate: Date, endDate: Date) {
    const logs = await this.getUserWorkLogs(userId, startDate, endDate);

    const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
    const billableHours = logs.filter((log) => log.is_billable).reduce((sum, log) => sum + Number(log.hours), 0);
    const taskHours = logs.filter((log) => log.task_id).reduce((sum, log) => sum + Number(log.hours), 0);
    const daysWorked = new Set(logs.map((log) => log.work_date.toISOString().split('T')[0])).size;

    // Group by project
    const byProject: Record<string, { project_id: string; project_name: string; hours: number }> = {};
    logs.forEach((log) => {
      if (log.project_id) {
        if (!byProject[log.project_id]) {
          byProject[log.project_id] = {
            project_id: log.project_id,
            project_name: log.project?.name || 'Unknown',
            hours: 0,
          };
        }
        byProject[log.project_id].hours += Number(log.hours);
      }
    });

    return {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      taskHours,
      generalHours: totalHours - taskHours,
      daysWorked,
      logsCount: logs.length,
      averageHoursPerDay: daysWorked > 0 ? totalHours / daysWorked : 0,
      byProject: Object.values(byProject).sort((a, b) => b.hours - a.hours),
    };
  }

  /**
   * Get project time stats
   */
  async getProjectTimeStats(projectId: string) {
    const logs = await this.getProjectWorkLogs(projectId);

    const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);
    const billableHours = logs.filter((log) => log.is_billable).reduce((sum, log) => sum + Number(log.hours), 0);

    // Group by user
    const byUser: Record<string, { user_id: string; user_name: string; hours: number }> = {};
    logs.forEach((log) => {
      if (!byUser[log.user_id]) {
        byUser[log.user_id] = {
          user_id: log.user_id,
          user_name: log.user ? `${log.user.first_name} ${log.user.last_name}` : 'Unknown',
          hours: 0,
        };
      }
      byUser[log.user_id].hours += Number(log.hours);
    });

    // Group by task
    const byTask: Record<string, { task_id: string; task_title: string; hours: number }> = {};
    logs.forEach((log) => {
      if (log.task_id) {
        if (!byTask[log.task_id]) {
          byTask[log.task_id] = {
            task_id: log.task_id,
            task_title: log.task?.title || 'Unknown',
            hours: 0,
          };
        }
        byTask[log.task_id].hours += Number(log.hours);
      }
    });

    return {
      totalHours,
      billableHours,
      nonBillableHours: totalHours - billableHours,
      logsCount: logs.length,
      byUser: Object.values(byUser).sort((a, b) => b.hours - a.hours),
      byTask: Object.values(byTask).sort((a, b) => b.hours - a.hours),
    };
  }

  /**
   * Update task's actual_hours from work logs
   */
  private async updateTaskActualHours(taskId: string): Promise<void> {
    const logs = await this.workLogRepository.find({
      where: { task_id: taskId },
    });

    const totalHours = logs.reduce((sum, log) => sum + Number(log.hours), 0);

    await this.taskRepository.update(taskId, {
      actual_hours: totalHours,
    });
  }

  /**
   * Log activity
   */
  private async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    description: string
  ): Promise<void> {
    try {
      const activity = this.activityLogRepository.create({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        description,
      });
      await this.activityLogRepository.save(activity);
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get daily work summary for calendar view
   */
  async getDailyWorkSummary(userId: string, startDate: Date, endDate: Date) {
    const logs = await this.getUserWorkLogs(userId, startDate, endDate);

    // Group by date
    const byDate: Record<
      string,
      {
        date: string;
        totalHours: number;
        logs: Array<{
          id: string;
          hours: number;
          description: string | null;
          task_title: string | null;
          project_name: string | null;
        }>;
      }
    > = {};

    logs.forEach((log) => {
      const dateStr = log.work_date.toISOString().split('T')[0];
      if (!byDate[dateStr]) {
        byDate[dateStr] = {
          date: dateStr,
          totalHours: 0,
          logs: [],
        };
      }
      byDate[dateStr].totalHours += Number(log.hours);
      byDate[dateStr].logs.push({
        id: log.id,
        hours: Number(log.hours),
        description: log.description,
        task_title: log.task?.title || null,
        project_name: log.project?.name || null,
      });
    });

    return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
  }
}

export default new WorkLogService();
