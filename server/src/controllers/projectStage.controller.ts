import { Request, Response } from 'express';
import { projectStageService } from '../services/projectStage.service';

export const projectStageController = {
  /**
   * Create a new stage for a project
   */
  async createStage(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { name, description, color, position, is_completed_stage } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Stage name is required',
        });
        return;
      }

      const stage = await projectStageService.createStage({
        project_id: projectId,
        name,
        description,
        color,
        position,
        is_completed_stage,
      });

      res.status(201).json({
        success: true,
        data: stage,
      });
    } catch (error) {
      console.error('Error creating stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stage',
      });
    }
  },

  /**
   * Get all stages for a project
   */
  async getProjectStages(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const stages = await projectStageService.getProjectStages(projectId);

      res.json({
        success: true,
        data: stages,
      });
    } catch (error) {
      console.error('Error getting project stages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project stages',
      });
    }
  },

  /**
   * Get a single stage by ID
   */
  async getStageById(req: Request, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;
      const stage = await projectStageService.getStageById(stageId);

      if (!stage) {
        res.status(404).json({
          success: false,
          message: 'Stage not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stage,
      });
    } catch (error) {
      console.error('Error getting stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stage',
      });
    }
  },

  /**
   * Update a stage
   */
  async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;
      const { name, description, color, position, is_completed_stage, is_active } = req.body;

      const stage = await projectStageService.updateStage(stageId, {
        name,
        description,
        color,
        position,
        is_completed_stage,
        is_active,
      });

      if (!stage) {
        res.status(404).json({
          success: false,
          message: 'Stage not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stage,
      });
    } catch (error) {
      console.error('Error updating stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stage',
      });
    }
  },

  /**
   * Delete a stage
   */
  async deleteStage(req: Request, res: Response): Promise<void> {
    try {
      const { stageId } = req.params;
      const { moveTasksToStageId } = req.body;

      const deleted = await projectStageService.deleteStage(stageId, moveTasksToStageId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Stage not found',
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete stage',
      });
    }
  },

  /**
   * Reorder stages within a project
   */
  async reorderStages(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { stageIds } = req.body;

      if (!Array.isArray(stageIds)) {
        res.status(400).json({
          success: false,
          message: 'stageIds must be an array',
        });
        return;
      }

      await projectStageService.reorderStages(projectId, stageIds);

      res.json({
        success: true,
        message: 'Stages reordered successfully',
      });
    } catch (error) {
      console.error('Error reordering stages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reorder stages',
      });
    }
  },

  /**
   * Create default stages for a project
   */
  async createDefaultStages(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const stages = await projectStageService.createDefaultStages(projectId);

      res.status(201).json({
        success: true,
        data: stages,
      });
    } catch (error) {
      console.error('Error creating default stages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create default stages',
      });
    }
  },

  /**
   * Get tasks grouped by stages
   */
  async getTasksByStages(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const result = await projectStageService.getTasksByStages(projectId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error getting tasks by stages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tasks by stages',
      });
    }
  },

  /**
   * Move a task to a stage
   */
  async moveTaskToStage(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const { stageId } = req.body;

      const task = await projectStageService.moveTaskToStage(taskId, stageId);

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found',
        });
        return;
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      console.error('Error moving task to stage:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to move task to stage',
      });
    }
  },
};
