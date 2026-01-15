import { Request, Response } from 'express';
import activityService from '../services/activity.service';

export class ActivityController {
  /**
   * Get recent activities
   * GET /api/activities/recent
   */
  async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await activityService.getRecentActivities(limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get user's activities
   * GET /api/activities/my
   */
  async getUserActivities(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 100;
      const activities = await activityService.getUserActivities(userId, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get project activities
   * GET /api/activities/project/:projectId
   */
  async getProjectActivities(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const activities = await activityService.getProjectActivities(projectId);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get activities by entity type
   * GET /api/activities/type/:entityType
   */
  async getActivitiesByEntityType(req: Request, res: Response): Promise<void> {
    try {
      const { entityType } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await activityService.getActivitiesByEntityType(entityType, limit);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get activity feed
   * GET /api/activities/feed
   */
  async getActivityFeed(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const filters = {
        entityTypes: req.query.entityTypes ? (req.query.entityTypes as string).split(',') : undefined,
      };

      const activities = await activityService.getActivityFeed(userId, filters);
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new ActivityController();
