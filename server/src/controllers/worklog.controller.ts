import { Request, Response } from 'express';
import workLogService from '../services/worklog.service';

export class WorkLogController {
  /**
   * Create new work log
   * POST /api/work-logs
   */
  async createWorkLog(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const workLog = await workLogService.createWorkLog(userId, req.body);
      res.status(201).json(workLog);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get work logs with filters
   * GET /api/work-logs
   */
  async getWorkLogs(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        user_id: req.query.user_id as string,
        task_id: req.query.task_id as string,
        project_id: req.query.project_id as string,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
      };

      const workLogs = await workLogService.getWorkLogs(filters);
      res.json(workLogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get my work logs
   * GET /api/work-logs/my
   */
  async getMyWorkLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();

      const workLogs = await workLogService.getUserWorkLogs(userId, startDate, endDate);
      res.json(workLogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get my time stats
   * GET /api/work-logs/my/stats
   */
  async getMyTimeStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();

      const stats = await workLogService.getUserTimeStats(userId, startDate, endDate);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get daily work summary for calendar
   * GET /api/work-logs/my/daily
   */
  async getMyDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const startDate = req.query.start_date
        ? new Date(req.query.start_date as string)
        : new Date(new Date().setDate(new Date().getDate() - 30));
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : new Date();

      const summary = await workLogService.getDailyWorkSummary(userId, startDate, endDate);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get work log by ID
   * GET /api/work-logs/:id
   */
  async getWorkLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const workLog = await workLogService.getWorkLogById(id);

      if (!workLog) {
        res.status(404).json({ message: 'Work log not found' });
        return;
      }

      res.json(workLog);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Update work log
   * PUT /api/work-logs/:id
   */
  async updateWorkLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const workLog = await workLogService.updateWorkLog(id, userId, req.body);
      res.json(workLog);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete work log
   * DELETE /api/work-logs/:id
   */
  async deleteWorkLog(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await workLogService.deleteWorkLog(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get task work logs
   * GET /api/tasks/:taskId/work-logs
   */
  async getTaskWorkLogs(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      const workLogs = await workLogService.getTaskWorkLogs(taskId);
      res.json(workLogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get project work logs
   * GET /api/projects/:id/work-logs
   */
  async getProjectWorkLogs(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id || req.params.projectId;
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;

      const workLogs = await workLogService.getProjectWorkLogs(projectId, startDate, endDate);
      res.json(workLogs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get project time stats
   * GET /api/projects/:id/time-stats
   */
  async getProjectTimeStats(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id || req.params.projectId;
      const stats = await workLogService.getProjectTimeStats(projectId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export const workLogController = new WorkLogController();
