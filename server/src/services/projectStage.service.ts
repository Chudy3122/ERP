import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { ProjectStage } from '../models/ProjectStage.model';
import { Task } from '../models/Task.model';
import projectTemplateService from './projectTemplate.service';

const projectStageRepository = AppDataSource.getRepository(ProjectStage);
const taskRepository = AppDataSource.getRepository(Task);

interface CreateStageData {
  project_id: string;
  name: string;
  description?: string;
  color?: string;
  position?: number;
  is_completed_stage?: boolean;
}

interface UpdateStageData {
  name?: string;
  description?: string;
  color?: string;
  position?: number;
  is_completed_stage?: boolean;
  is_active?: boolean;
}

export const projectStageService = {
  /**
   * Create a new project stage
   */
  async createStage(data: CreateStageData): Promise<ProjectStage> {
    // Get the max position for this project
    const maxPositionResult = await projectStageRepository
      .createQueryBuilder('stage')
      .select('MAX(stage.position)', 'maxPos')
      .where('stage.project_id = :projectId', { projectId: data.project_id })
      .getRawOne();

    const position = data.position ?? (maxPositionResult?.maxPos ?? -1) + 1;

    const stage = projectStageRepository.create({
      ...data,
      position,
    });

    return await projectStageRepository.save(stage);
  },

  /**
   * Get all stages for a project
   */
  async getProjectStages(projectId: string): Promise<ProjectStage[]> {
    return await projectStageRepository.find({
      where: { project_id: projectId, is_active: true },
      order: { position: 'ASC' },
    });
  },

  /**
   * Get stage by ID
   */
  async getStageById(stageId: string): Promise<ProjectStage | null> {
    return await projectStageRepository.findOne({
      where: { id: stageId },
      relations: ['project'],
    });
  },

  /**
   * Update a stage
   */
  async updateStage(stageId: string, data: UpdateStageData): Promise<ProjectStage | null> {
    const stage = await projectStageRepository.findOne({ where: { id: stageId } });
    if (!stage) return null;

    Object.assign(stage, data);
    return await projectStageRepository.save(stage);
  },

  /**
   * Delete a stage (soft delete by setting is_active = false)
   */
  async deleteStage(stageId: string, moveTasksToStageId?: string): Promise<boolean> {
    const stage = await projectStageRepository.findOne({ where: { id: stageId } });
    if (!stage) return false;

    // Move tasks to another stage or unassign them
    if (moveTasksToStageId) {
      await taskRepository.update(
        { stage_id: stageId },
        { stage_id: moveTasksToStageId }
      );
    } else {
      await taskRepository.update(
        { stage_id: stageId },
        { stage_id: undefined }
      );
    }

    // Soft delete
    stage.is_active = false;
    await projectStageRepository.save(stage);

    return true;
  },

  /**
   * Reorder stages within a project
   */
  async reorderStages(projectId: string, stageIds: string[]): Promise<void> {
    const updates = stageIds.map((stageId, index) =>
      projectStageRepository.update(
        { id: stageId, project_id: projectId },
        { position: index }
      )
    );

    await Promise.all(updates);
  },

  /**
   * Create default stages for a new project
   */
  async createDefaultStages(projectId: string, templateId?: string, createdBy?: string): Promise<ProjectStage[]> {
    // Check if stages already exist for this project
    const existingStages = await projectStageRepository.find({
      where: { project_id: projectId },
    });

    if (existingStages.length > 0) {
      return existingStages;
    }

    // If templateId provided, apply template instead of defaults
    if (templateId && createdBy) {
      return await projectTemplateService.applyTemplateToProject(templateId, projectId, createdBy);
    }

    const defaultStages = [
      { name: 'Do zrobienia', color: '#6B7280', position: 0, is_completed_stage: false },
      { name: 'W trakcie', color: '#3B82F6', position: 1, is_completed_stage: false },
      { name: 'Do sprawdzenia', color: '#8B5CF6', position: 2, is_completed_stage: false },
      { name: 'Zakończone', color: '#10B981', position: 3, is_completed_stage: true },
    ];

    const stages: ProjectStage[] = [];
    for (const stageData of defaultStages) {
      const stage = projectStageRepository.create({
        project_id: projectId,
        ...stageData,
      });
      stages.push(await projectStageRepository.save(stage));
    }

    return stages;
  },

  /**
   * Get tasks grouped by stages for a project
   */
  async getTasksByStages(projectId: string): Promise<{ stage: ProjectStage | null; tasks: Task[] }[]> {
    const stages = await this.getProjectStages(projectId);

    // Get tasks with no stage (stage_id is NULL)
    const unassignedTasks = await taskRepository.find({
      where: { project_id: projectId, stage_id: IsNull() },
      relations: ['assignee', 'creator'],
      order: { order_index: 'ASC', created_at: 'DESC' },
    });

    const result: { stage: ProjectStage | null; tasks: Task[] }[] = [];

    // Add unassigned tasks first if any
    if (unassignedTasks.length > 0) {
      result.push({ stage: null, tasks: unassignedTasks });
    }

    // Get tasks for each stage
    for (const stage of stages) {
      const tasks = await taskRepository.find({
        where: { project_id: projectId, stage_id: stage.id },
        relations: ['assignee', 'creator'],
        order: { order_index: 'ASC', created_at: 'DESC' },
      });
      result.push({ stage, tasks });
    }

    return result;
  },

  /**
   * Move task to a stage
   */
  async moveTaskToStage(taskId: string, stageId: string | null): Promise<Task | null> {
    const task = await taskRepository.findOne({ where: { id: taskId } });
    if (!task) return null;

    task.stage_id = stageId as any;

    // If moving to a completed stage, mark task as done
    if (stageId) {
      const stage = await projectStageRepository.findOne({ where: { id: stageId } });
      if (stage?.is_completed_stage) {
        task.status = 'done' as any;
        task.completed_at = new Date();
      }
    }

    return await taskRepository.save(task);
  },
};
