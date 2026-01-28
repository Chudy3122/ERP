import { AppDataSource } from '../config/database';
import { Task, TaskStatus, TaskPriority } from '../models/Task.model';
import { TaskAttachment } from '../models/TaskAttachment.model';
import { User } from '../models/User.model';
import activityService from './activity.service';
import { deleteFile } from '../config/multer';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

interface CreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  estimated_hours?: number;
  due_date?: Date;
  parent_task_id?: string;
  stage_id?: string;
}

interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: Date;
  completed_at?: Date;
  order_index?: number;
  stage_id?: string | null;
}

export class TaskService {
  private taskRepository = AppDataSource.getRepository(Task);
  private taskAttachmentRepository = AppDataSource.getRepository(TaskAttachment);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskDto, userId: string): Promise<Task> {
    const task = this.taskRepository.create({
      ...data,
      created_by: userId,
    });

    const savedTask = await this.taskRepository.save(task);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'created_task',
        'task',
        savedTask.id,
        `${user.first_name} ${user.last_name} utworzył zadanie "${savedTask.title}"`,
        { project_id: savedTask.project_id }
      );
    }

    return savedTask;
  }

  /**
   * Get task by ID
   */
  async getTaskById(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['project', 'assignee', 'creator', 'parent', 'subtasks'],
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  /**
   * Get all tasks with filters
   */
  async getAllTasks(filters?: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: string;
    search?: string;
  }): Promise<Task[]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .orderBy('task.order_index', 'ASC')
      .addOrderBy('task.created_at', 'DESC');

    if (filters) {
      if (filters.projectId) {
        queryBuilder.andWhere('task.project_id = :projectId', { projectId: filters.projectId });
      }

      if (filters.status) {
        queryBuilder.andWhere('task.status = :status', { status: filters.status });
      }

      if (filters.priority) {
        queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
      }

      if (filters.assignedTo) {
        queryBuilder.andWhere('task.assigned_to = :assignedTo', { assignedTo: filters.assignedTo });
      }

      if (filters.search) {
        queryBuilder.andWhere('(task.title ILIKE :search OR task.description ILIKE :search)', {
          search: `%${filters.search}%`,
        });
      }
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(projectId: string, filters?: {
    status?: TaskStatus;
    assignedTo?: string;
  }): Promise<Task[]> {
    return await this.getAllTasks({ projectId, ...filters });
  }

  /**
   * Get user's tasks (assigned to them OR created by them)
   */
  async getUserTasks(userId: string, filters?: {
    status?: TaskStatus;
    priority?: TaskPriority;
  }): Promise<Task[]> {
    const queryBuilder = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .where('(task.assigned_to = :userId OR task.created_by = :userId)', { userId })
      .orderBy('task.created_at', 'DESC');

    if (filters?.status) {
      queryBuilder.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    return queryBuilder.getMany();
  }

  /**
   * Update task
   */
  async updateTask(id: string, data: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.getTaskById(id);

    // If status changed to done, set completed_at
    if (data.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      data.completed_at = new Date();
    }

    Object.assign(task, data);
    const updatedTask = await this.taskRepository.save(task);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_task',
        'task',
        task.id,
        `${user.first_name} ${user.last_name} zaktualizował zadanie "${task.title}"`,
        { changes: data }
      );
    }

    return updatedTask;
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: string, assigneeId: string, assignedBy: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    task.assigned_to = assigneeId;

    const updatedTask = await this.taskRepository.save(task);

    // Log activity
    const assignee = await this.userRepository.findOne({ where: { id: assigneeId } });
    const assigner = await this.userRepository.findOne({ where: { id: assignedBy } });

    if (assignee && assigner) {
      await activityService.logActivity(
        assignedBy,
        'assigned_task',
        'task',
        taskId,
        `${assigner.first_name} ${assigner.last_name} przypisał zadanie "${task.title}" do ${assignee.first_name} ${assignee.last_name}`,
        { assignee_id: assigneeId }
      );
    }

    return updatedTask;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task> {
    const task = await this.getTaskById(taskId);
    const oldStatus = task.status;
    task.status = status;

    if (status === TaskStatus.DONE) {
      task.completed_at = new Date();
    }

    const updatedTask = await this.taskRepository.save(task);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'changed_task_status',
        'task',
        taskId,
        `${user.first_name} ${user.last_name} zmienił status zadania "${task.title}" z "${oldStatus}" na "${status}"`,
        { old_status: oldStatus, new_status: status }
      );
    }

    return updatedTask;
  }

  /**
   * Delete task
   */
  async deleteTask(id: string, userId: string): Promise<void> {
    const task = await this.getTaskById(id);

    await this.taskRepository.remove(task);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_task',
        'task',
        null,
        `${user.first_name} ${user.last_name} usunął zadanie "${task.title}"`,
        { project_id: task.project_id }
      );
    }
  }

  /**
   * Get upcoming deadlines for user (for dashboard widget)
   */
  async getUpcomingDeadlines(userId: string, days: number): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    return await this.taskRepository.find({
      where: {
        assigned_to: userId,
        status: TaskStatus.TODO || TaskStatus.IN_PROGRESS,
        due_date: Between(today, futureDate),
      },
      relations: ['project'],
      order: {
        due_date: 'ASC',
        priority: 'DESC',
      },
    });
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(userId: string): Promise<Task[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.taskRepository.find({
      where: {
        assigned_to: userId,
        status: TaskStatus.TODO || TaskStatus.IN_PROGRESS,
        due_date: Between(today, tomorrow),
      },
      relations: ['project'],
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Get tasks due tomorrow
   */
  async getTasksDueTomorrow(userId: string): Promise<Task[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    return await this.taskRepository.find({
      where: {
        assigned_to: userId,
        status: TaskStatus.TODO || TaskStatus.IN_PROGRESS,
        due_date: Between(tomorrow, dayAfter),
      },
      relations: ['project'],
      order: {
        priority: 'DESC',
      },
    });
  }

  /**
   * Get tasks grouped by status (for Kanban)
   */
  async getTasksGroupedByStatus(projectId: string): Promise<Record<TaskStatus, Task[]>> {
    const tasks = await this.getProjectTasks(projectId);

    const grouped: Record<TaskStatus, Task[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.REVIEW]: [],
      [TaskStatus.DONE]: [],
      [TaskStatus.BLOCKED]: [],
    };

    tasks.forEach((task) => {
      grouped[task.status].push(task);
    });

    return grouped;
  }

  /**
   * Upload attachments to task
   */
  async uploadAttachments(
    taskId: string,
    files: Express.Multer.File[],
    userId: string
  ): Promise<TaskAttachment[]> {
    // Verify task exists
    await this.getTaskById(taskId);

    const attachments: TaskAttachment[] = [];

    for (const file of files) {
      const attachment = this.taskAttachmentRepository.create({
        task_id: taskId,
        file_name: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: `/uploads/attachments/${file.filename}`,
        uploaded_by: userId,
      });

      const savedAttachment = await this.taskAttachmentRepository.save(attachment);
      attachments.push(savedAttachment);
    }

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const task = await this.getTaskById(taskId);

    if (user) {
      await activityService.logActivity(
        userId,
        'uploaded_task_attachment',
        'task',
        taskId,
        `${user.first_name} ${user.last_name} dodał ${files.length} załącznik(ów) do zadania "${task.title}"`,
        { file_count: files.length }
      );
    }

    return attachments;
  }

  /**
   * Get task attachments
   */
  async getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    return await this.taskAttachmentRepository.find({
      where: { task_id: taskId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Delete task attachment
   */
  async deleteAttachment(taskId: string, attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.taskAttachmentRepository.findOne({
      where: { id: attachmentId, task_id: taskId },
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Delete file from disk
    try {
      await deleteFile(attachment.file_name);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
    }

    await this.taskAttachmentRepository.remove(attachment);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const task = await this.getTaskById(taskId);

    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_task_attachment',
        'task',
        taskId,
        `${user.first_name} ${user.last_name} usunął załącznik "${attachment.original_name}" z zadania "${task.title}"`,
        { file_name: attachment.original_name }
      );
    }
  }
}

export default new TaskService();
