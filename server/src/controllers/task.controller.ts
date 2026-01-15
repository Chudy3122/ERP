import { Request, Response } from 'express';
import taskService from '../services/task.service';
import { TaskStatus, TaskPriority } from '../models/Task.model';

export class TaskController {
  /**
   * Create new task
   * POST /api/tasks
   */
  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const task = await taskService.createTask(req.body, userId);
      res.status(201).json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all tasks with filters
   * GET /api/tasks
   */
  async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        projectId: req.query.projectId as string,
        assignedTo: req.query.assignedTo as string,
        status: req.query.status as TaskStatus,
        priority: req.query.priority as TaskPriority,
        search: req.query.search as string,
      };

      const tasks = await taskService.getAllTasks(filters);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get user's tasks
   * GET /api/tasks/my
   */
  async getUserTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const filters = {
        status: req.query.status as TaskStatus,
        priority: req.query.priority as TaskPriority,
      };

      const tasks = await taskService.getUserTasks(userId, filters);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get upcoming deadlines
   * GET /api/tasks/upcoming-deadlines
   */
  async getUpcomingDeadlines(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const days = parseInt(req.query.days as string) || 7;

      const tasks = await taskService.getUpcomingDeadlines(userId, days);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get tasks due today
   * GET /api/tasks/due-today
   */
  async getTasksDueToday(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tasks = await taskService.getTasksDueToday(userId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get tasks due tomorrow
   * GET /api/tasks/due-tomorrow
   */
  async getTasksDueTomorrow(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const tasks = await taskService.getTasksDueTomorrow(userId);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get project tasks
   * GET /api/tasks/project/:projectId
   */
  async getProjectTasks(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const filters = {
        status: req.query.status as TaskStatus,
        assignedTo: req.query.assignedTo as string,
      };

      const tasks = await taskService.getProjectTasks(projectId, filters);
      res.json(tasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get tasks grouped by status (for Kanban)
   * GET /api/tasks/project/:projectId/kanban
   */
  async getTasksGroupedByStatus(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const groupedTasks = await taskService.getTasksGroupedByStatus(projectId);
      res.json(groupedTasks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get task by ID
   * GET /api/tasks/:id
   */
  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await taskService.getTaskById(id);
      res.json(task);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update task
   * PUT /api/tasks/:id
   */
  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const task = await taskService.updateTask(id, req.body, userId);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Assign task
   * PUT /api/tasks/:id/assign
   */
  async assignTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId: assigneeId } = req.body;
      const assignedBy = req.user!.userId;

      const task = await taskService.assignTask(id, assigneeId, assignedBy);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update task status
   * PUT /api/tasks/:id/status
   */
  async updateTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      const task = await taskService.updateTaskStatus(id, status as TaskStatus, userId);
      res.json(task);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete task
   * DELETE /api/tasks/:id
   */
  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await taskService.deleteTask(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export default new TaskController();
