import { AppDataSource } from '../config/database';
import { Project, ProjectStatus, ProjectPriority } from '../models/Project.model';
import { ProjectMember, ProjectMemberRole } from '../models/ProjectMember.model';
import { User } from '../models/User.model';
import activityService from './activity.service';
import { IsNull } from 'typeorm';

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
   * Get user's projects (where user is member or manager)
   */
  async getUserProjects(userId: string): Promise<Project[]> {
    const projectMembers = await this.projectMemberRepository.find({
      where: { user_id: userId, left_at: IsNull() },
      relations: ['project', 'project.creator', 'project.manager'],
    });

    return projectMembers.map((pm) => pm.project);
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

    // TODO: Add task statistics when task service is ready

    return {
      project,
      memberCount: members.length,
      members,
    };
  }
}

export default new ProjectService();
