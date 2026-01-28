import { AppDataSource } from '../config/database';
import { Project, ProjectStatus, ProjectPriority } from '../models/Project.model';
import { ProjectMember, ProjectMemberRole } from '../models/ProjectMember.model';
import { ProjectAttachment } from '../models/ProjectAttachment.model';
import { Task } from '../models/Task.model';
import { User } from '../models/User.model';
import activityService from './activity.service';
import { IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

interface CreateProjectDto {
  name: string;
  description?: string;
  code: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: Date;
  target_end_date?: Date;
  budget?: number;
  manager_id?: string;
}

interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: Date;
  target_end_date?: Date;
  actual_end_date?: Date;
  budget?: number;
  manager_id?: string;
  is_archived?: boolean;
}

export class ProjectService {
  private projectRepository = AppDataSource.getRepository(Project);
  private projectMemberRepository = AppDataSource.getRepository(ProjectMember);
  private projectAttachmentRepository = AppDataSource.getRepository(ProjectAttachment);
  private taskRepository = AppDataSource.getRepository(Task);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectDto, userId: string): Promise<Project> {
    // Check if code already exists
    const existingProject = await this.projectRepository.findOne({
      where: { code: data.code },
    });

    if (existingProject) {
      throw new Error('Project code already exists');
    }

    const project = this.projectRepository.create({
      ...data,
      created_by: userId,
    });

    const savedProject = await this.projectRepository.save(project);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'created_project',
        'project',
        savedProject.id,
        `${user.first_name} ${user.last_name} utworzył projekt "${savedProject.name}"`,
        { project_code: savedProject.code }
      );
    }

    return savedProject;
  }

  /**
   * Get all projects with filters
   */
  async getAllProjects(filters?: {
    status?: ProjectStatus;
    priority?: ProjectPriority;
    managerId?: string;
    search?: string;
    isArchived?: boolean;
  }): Promise<{ projects: Project[]; total: number }> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.creator', 'creator')
      .leftJoinAndSelect('project.manager', 'manager')
      .orderBy('project.created_at', 'DESC');

    if (filters) {
      if (filters.status) {
        queryBuilder.andWhere('project.status = :status', { status: filters.status });
      }

      if (filters.priority) {
        queryBuilder.andWhere('project.priority = :priority', { priority: filters.priority });
      }

      if (filters.managerId) {
        queryBuilder.andWhere('project.manager_id = :managerId', { managerId: filters.managerId });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(project.name ILIKE :search OR project.code ILIKE :search OR project.description ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters.isArchived !== undefined) {
        queryBuilder.andWhere('project.is_archived = :isArchived', { isArchived: filters.isArchived });
      }
    }

    const [projects, total] = await queryBuilder.getManyAndCount();

    return { projects, total };
  }

  /**
   * Get user's projects (where user is member, manager, or creator)
   * Admins and team leaders see all non-archived projects
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    // Check if user is admin or team leader
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (user && (user.role === 'admin' || user.role === 'team_leader')) {
      // Admins and team leaders see all non-archived projects
      return this.projectRepository.find({
        where: { is_archived: false },
        relations: ['creator', 'manager'],
        order: { name: 'ASC' },
      });
    }

    // For regular users, get projects where they are:
    // 1. A member
    // 2. The creator
    // 3. The manager
    const projectMembers = await this.projectMemberRepository.find({
      where: { user_id: userId, left_at: IsNull() },
      relations: ['project', 'project.creator', 'project.manager'],
    });

    const memberProjectIds = new Set(projectMembers.map((pm) => pm.project.id));

    // Also get projects where user is creator or manager
    const ownedProjects = await this.projectRepository.find({
      where: [
        { created_by: userId },
        { manager_id: userId },
      ],
      relations: ['creator', 'manager'],
    });

    // Merge and deduplicate
    const allProjects = [...projectMembers.map((pm) => pm.project)];
    for (const project of ownedProjects) {
      if (!memberProjectIds.has(project.id)) {
        allProjects.push(project);
      }
    }

    // Sort by name
    return allProjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['creator', 'manager'],
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  /**
   * Update project
   */
  async updateProject(id: string, data: UpdateProjectDto, userId: string): Promise<Project> {
    const project = await this.getProjectById(id);

    Object.assign(project, data);
    const updatedProject = await this.projectRepository.save(project);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_project',
        'project',
        project.id,
        `${user.first_name} ${user.last_name} zaktualizował projekt "${project.name}"`,
        { changes: data }
      );
    }

    return updatedProject;
  }

  /**
   * Delete project
   */
  async deleteProject(id: string, userId: string): Promise<void> {
    const project = await this.getProjectById(id);

    await this.projectRepository.remove(project);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_project',
        'project',
        null,
        `${user.first_name} ${user.last_name} usunął projekt "${project.name}"`,
        { project_code: project.code }
      );
    }
  }

  /**
   * Add project member
   */
  async addProjectMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    addedBy: string
  ): Promise<ProjectMember> {
    // Check if already a member
    const existingMember = await this.projectMemberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
        left_at: IsNull(),
      },
    });

    if (existingMember) {
      throw new Error('User is already a project member');
    }

    const member = this.projectMemberRepository.create({
      project_id: projectId,
      user_id: userId,
      role,
    });

    const savedMember = await this.projectMemberRepository.save(member);

    // Log activity
    const project = await this.getProjectById(projectId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const adder = await this.userRepository.findOne({ where: { id: addedBy } });

    if (user && adder) {
      await activityService.logActivity(
        addedBy,
        'added_project_member',
        'project',
        projectId,
        `${adder.first_name} ${adder.last_name} dodał ${user.first_name} ${user.last_name} do projektu "${project.name}"`,
        { role, member_id: userId }
      );
    }

    return savedMember;
  }

  /**
   * Remove project member
   */
  async removeProjectMember(projectId: string, userId: string, removedBy: string): Promise<void> {
    const member = await this.projectMemberRepository.findOne({
      where: {
        project_id: projectId,
        user_id: userId,
        left_at: IsNull(),
      },
    });

    if (!member) {
      throw new Error('Project member not found');
    }

    member.left_at = new Date();
    await this.projectMemberRepository.save(member);

    // Log activity
    const project = await this.getProjectById(projectId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const remover = await this.userRepository.findOne({ where: { id: removedBy } });

    if (user && remover) {
      await activityService.logActivity(
        removedBy,
        'removed_project_member',
        'project',
        projectId,
        `${remover.first_name} ${remover.last_name} usunął ${user.first_name} ${user.last_name} z projektu "${project.name}"`,
        { member_id: userId }
      );
    }
  }

  /**
   * Get project members
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return await this.projectMemberRepository.find({
      where: {
        project_id: projectId,
        left_at: IsNull(),
      },
      relations: ['user'],
      order: {
        role: 'ASC',
        joined_at: 'ASC',
      },
    });
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId: string): Promise<any> {
    const project = await this.getProjectById(projectId);
    const members = await this.getProjectMembers(projectId);

    // Get task statistics
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const todoTasks = tasks.filter(t => t.status === 'todo').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      in_progress_tasks: inProgressTasks,
      todo_tasks: todoTasks,
      blocked_tasks: blockedTasks,
      total_members: members.length,
      completion_percentage: completionPercentage,
    };
  }

  /**
   * Upload project attachments
   */
  async uploadAttachments(
    projectId: string,
    files: Express.Multer.File[],
    userId: string
  ): Promise<ProjectAttachment[]> {
    const attachments: ProjectAttachment[] = [];

    for (const file of files) {
      const attachment = this.projectAttachmentRepository.create({
        project_id: projectId,
        file_name: file.filename,
        original_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: `/uploads/${file.filename}`,
        uploaded_by: userId,
      });

      attachments.push(await this.projectAttachmentRepository.save(attachment));
    }

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const project = await this.getProjectById(projectId);
    if (user) {
      await activityService.logActivity(
        userId,
        'uploaded_project_files',
        'project',
        projectId,
        `${user.first_name} ${user.last_name} dodał ${files.length} plik(ów) do projektu "${project.name}"`,
        { file_count: files.length }
      );
    }

    return attachments;
  }

  /**
   * Get project attachments
   */
  async getProjectAttachments(projectId: string): Promise<ProjectAttachment[]> {
    return await this.projectAttachmentRepository.find({
      where: { project_id: projectId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Delete project attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.projectAttachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['project'],
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), 'uploads', attachment.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await this.projectAttachmentRepository.remove(attachment);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && attachment.project) {
      await activityService.logActivity(
        userId,
        'deleted_project_file',
        'project',
        attachment.project_id,
        `${user.first_name} ${user.last_name} usunął plik "${attachment.original_name}" z projektu "${attachment.project.name}"`,
        { file_name: attachment.original_name }
      );
    }
  }

  /**
   * Get project activity/history
   */
  async getProjectActivity(projectId: string, limit: number = 50): Promise<any[]> {
    const activities = await activityService.getActivities({
      entityType: 'project',
      entityId: projectId,
      limit,
    });

    // Also get task activities for this project
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId },
      select: ['id'],
    });

    const taskIds = tasks.map(t => t.id);

    if (taskIds.length > 0) {
      const taskActivities = await activityService.getActivitiesForEntities('task', taskIds, limit);
      activities.push(...taskActivities);
    }

    // Sort by date and limit
    return activities
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }
}

export default new ProjectService();
