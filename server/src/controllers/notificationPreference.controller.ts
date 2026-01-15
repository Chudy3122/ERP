import { Request, Response } from 'express';
import notificationPreferenceService from '../services/notificationPreference.service';

class NotificationPreferenceController {
  /**
   * Get current user's notification preferences
   * GET /api/notification-preferences
   */
  async getMyPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const preferences = await notificationPreferenceService.getUserPreferences(userId);

      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error: any) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get notification preferences',
        error: error.message,
      });
    }
  }

  /**
   * Update current user's notification preferences
   * PUT /api/notification-preferences
   */
  async updateMyPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const data = req.body;

      const preferences = await notificationPreferenceService.updatePreferences(userId, data);

      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: preferences,
      });
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update notification preferences',
      });
    }
  }

  /**
   * Reset notification preferences to default
   * POST /api/notification-preferences/reset
   */
  async resetPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const preferences = await notificationPreferenceService.resetToDefault(userId);

      res.status(200).json({
        success: true,
        message: 'Notification preferences reset to default',
        data: preferences,
      });
    } catch (error: any) {
      console.error('Error resetting notification preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset notification preferences',
        error: error.message,
      });
    }
  }

  /**
   * Check if user is in DND mode
   * GET /api/notification-preferences/dnd-status
   */
  async getDndStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const isDnd = await notificationPreferenceService.isDndActive(userId);

      res.status(200).json({
        success: true,
        data: { isDnd },
      });
    } catch (error: any) {
      console.error('Error checking DND status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check DND status',
        error: error.message,
      });
    }
  }
}

export default new NotificationPreferenceController();
