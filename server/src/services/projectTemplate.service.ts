import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { ProjectTemplate } from '../models/ProjectTemplate.model';
import { ProjectTemplateStage } from '../models/ProjectTemplateStage.model';
import { ProjectTemplateTask, TemplateTaskPriority } from '../models/ProjectTemplateTask.model';
import { ProjectStage } from '../models/ProjectStage.model';
import { Task, TaskStatus } from '../models/Task.model';

interface CreateTemplateStageDTO {
  name: string;
  description?: string;
  color?: string;
  position: number;
  is_completed_stage?: boolean;
}

interface CreateTemplateTaskDTO {
  stage_position: number;
  title: string;
  description?: string;
  priority?: TemplateTaskPriority;
  estimated_hours?: number;
  order_index?: number;
}

interface CreateTemplateDTO {
  name: string;
  description?: string;
  stages: CreateTemplateStageDTO[];
  tasks: CreateTemplateTaskDTO[];
}

interface UpdateTemplateDTO extends CreateTemplateDTO {}

class ProjectTemplateService {
  private templateRepository: Repository<ProjectTemplate>;
  private stageRepository: Repository<ProjectTemplateStage>;
  private taskRepository: Repository<ProjectTemplateTask>;
  private projectStageRepository: Repository<ProjectStage>;
  private projectTaskRepository: Repository<Task>;

  constructor() {
    this.templateRepository = AppDataSource.getRepository(ProjectTemplate);
    this.stageRepository = AppDataSource.getRepository(ProjectTemplateStage);
    this.taskRepository = AppDataSource.getRepository(ProjectTemplateTask);
    this.projectStageRepository = AppDataSource.getRepository(ProjectStage);
    this.projectTaskRepository = AppDataSource.getRepository(Task);
  }

  async createTemplate(data: CreateTemplateDTO, userId: string): Promise<ProjectTemplate> {
    const template = this.templateRepository.create({
      name: data.name,
      description: data.description,
      created_by: userId,
    });

    const savedTemplate = await this.templateRepository.save(template);

    // Create stages
    for (const stageData of data.stages) {
      const stage = this.stageRepository.create({
        template_id: savedTemplate.id,
        ...stageData,
      });
      await this.stageRepository.save(stage);
    }

    // Create tasks
    for (const taskData of data.tasks) {
      const task = this.taskRepository.create({
        template_id: savedTemplate.id,
        ...taskData,
      });
      await this.taskRepository.save(task);
    }

    return this.getTemplateById(savedTemplate.id) as Promise<ProjectTemplate>;
  }

  async getAllTemplates(): Promise<ProjectTemplate[]> {
    return this.templateRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async getTemplateById(id: string): Promise<ProjectTemplate | null> {
    return this.templateRepository.findOne({
      where: { id },
    });
  }

  async updateTemplate(id: string, data: UpdateTemplateDTO, userId: string): Promise<ProjectTemplate | null> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) return null;

    template.name = data.name;
    template.description = data.description || null as any;
    await this.templateRepository.save(template);

    // Replace stages: delete old, create new
    await this.stageRepository.delete({ template_id: id });
    for (const stageData of data.stages) {
      const stage = this.stageRepository.create({
        template_id: id,
        ...stageData,
      });
      await this.stageRepository.save(stage);
    }

    // Replace tasks: delete old, create new
    await this.taskRepository.delete({ template_id: id });
    for (const taskData of data.tasks) {
      const task = this.taskRepository.create({
        template_id: id,
        ...taskData,
      });
      await this.taskRepository.save(task);
    }

    return this.getTemplateById(id);
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.templateRepository.findOne({ where: { id } });
    if (!template) return false;

    template.is_active = false;
    await this.templateRepository.save(template);
    return true;
  }

  /**
   * Apply a template to a project - creates project stages and tasks from template
   */
  async applyTemplateToProject(templateId: string, projectId: string, createdBy: string): Promise<ProjectStage[]> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Sort stages by position
    const sortedStages = [...(template.stages || [])].sort((a, b) => a.position - b.position);
    const sortedTasks = [...(template.tasks || [])].sort((a, b) => a.order_index - b.order_index);

    // Create project stages and build position->id mapping
    const positionToStageId = new Map<number, string>();
    const createdStages: ProjectStage[] = [];

    for (const templateStage of sortedStages) {
      const projectStage = this.projectStageRepository.create({
        project_id: projectId,
        name: templateStage.name,
        description: templateStage.description,
        color: templateStage.color,
        position: templateStage.position,
        is_completed_stage: templateStage.is_completed_stage,
      });
      const savedStage = await this.projectStageRepository.save(projectStage);
      positionToStageId.set(templateStage.position, savedStage.id);
      createdStages.push(savedStage);
    }

    // Create tasks assigned to the right stages
    for (const templateTask of sortedTasks) {
      const stageId = positionToStageId.get(templateTask.stage_position);
      const task = this.projectTaskRepository.create({
        project_id: projectId,
        stage_id: stageId || (undefined as any),
        title: templateTask.title,
        description: templateTask.description,
        priority: templateTask.priority as any,
        estimated_hours: templateTask.estimated_hours,
        order_index: templateTask.order_index,
        status: TaskStatus.TODO,
        created_by: createdBy,
      });
      await this.projectTaskRepository.save(task);
    }

    return createdStages;
  }
}

export default new ProjectTemplateService();
