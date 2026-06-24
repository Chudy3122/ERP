import { AppDataSource } from '../config/database';
import { Task, TaskStatus, TaskPriority } from '../models/Task.model';
import { TaskAttachment } from '../models/TaskAttachment.model';
import { ProjectAttachment } from '../models/ProjectAttachment.model';
import { User } from '../models/User.model';
import activityService from './activity.service';
import { deleteFile } from '../config/multer';
import { uploadAttachmentToCloudinary } from '../utils/uploadAttachment';
import { Between, In } from 'typeorm';

interface CreateTaskDto {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  assignee_ids?: string[];
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
  assignee_ids?: string[];
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
  private projectAttachmentRepository = AppDataSource.getRepository(ProjectAttachment);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new task
   */
  async createTask(data: CreateTaskDto, userId: string): Promise<Task> {
    const { assignee_ids, ...taskData } = data;
    if (assignee_ids && assignee_ids.length > 0 && !taskData.assigned_to) {
      taskData.assigned_to = assignee_ids[0];
    }

    const task = this.taskRepository.create({ ...taskData, created_by: userId });
    const savedTask = await this.taskRepository.save(task);

    if (assignee_ids && assignee_ids.length > 0) {
      savedTask.assignees = await this.userRepository.find({ where: { id: In(assignee_ids) } });
      await this.taskRepository.save(savedTask);
    }

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
      relations: ['project', 'assignee', 'assignees', 'creator', 'parent', 'subtasks'],
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
      .leftJoinAndSelect('task.assignees', 'assignees')
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
      .leftJoinAndSelect('task.assignees', 'assignees')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoin('task_assignees', 'ta_filter', 'ta_filter.task_id = task.id AND ta_filter.user_id = :userId', { userId })
      .where('(task.assigned_to = :userId OR task.created_by = :userId OR ta_filter.user_id IS NOT NULL)')
      .distinct(true)
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

    const { assignee_ids, ...updateData } = data;

    // If status changed to done, set completed_at
    if (updateData.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      updateData.completed_at = new Date();
    }

    if (assignee_ids !== undefined) {
      task.assignees = assignee_ids.length > 0
        ? await this.userRepository.find({ where: { id: In(assignee_ids) } })
        : [];
      task.assigned_to = assignee_ids[0] ?? null;
    }

    Object.assign(task, updateData);
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
      const url = await uploadAttachmentToCloudinary(file);
      const attachment = this.taskAttachmentRepository.create({
        task_id: taskId,
        file_name: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: url,
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
   * Link existing project files to a task (no re-upload — same Cloudinary file).
   * Only files from the task's own project can be linked; already-linked files are skipped.
   */
  async linkProjectAttachments(
    taskId: string,
    attachmentIds: string[],
    userId: string
  ): Promise<TaskAttachment[]> {
    const task = await this.getTaskById(taskId);
    if (!attachmentIds || attachmentIds.length === 0) return [];

    const projectFiles = await this.projectAttachmentRepository.find({
      where: { id: In(attachmentIds), project_id: task.project_id },
    });

    // Skip files already linked to this task (same URL)
    const existing = await this.taskAttachmentRepository.find({ where: { task_id: taskId } });
    const existingUrls = new Set(existing.map((a) => a.file_url));

    const created: TaskAttachment[] = [];
    for (const pf of projectFiles) {
      if (existingUrls.has(pf.file_url)) continue;
      const attachment = this.taskAttachmentRepository.create({
        task_id: taskId,
        file_name: pf.file_name,
        original_name: pf.original_name,
        file_type: pf.file_type,
        file_size: pf.file_size,
        file_url: pf.file_url, // same stored file — a link, not a copy
        uploaded_by: userId,
      });
      created.push(await this.taskAttachmentRepository.save(attachment));
    }

    if (created.length > 0) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        await activityService.logActivity(
          userId,
          'linked_task_attachment',
          'task',
          taskId,
          `${user.first_name} ${user.last_name} podpiął ${created.length} plik(ów) z projektu do zadania "${task.title}"`,
          { file_count: created.length }
        );
      }
    }

    return created;
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
