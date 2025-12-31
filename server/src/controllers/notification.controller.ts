import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import { NotificationPriority } from '../models/Notification.model';

class NotificationController {
  /**
   * Get user's notifications
   * GET /api/notifications
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getUserNotifications(
        userId,
        page,
        limit,
        unreadOnly
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
      });
    }
  }

  /**
   * Get unread notifications count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch unread count',
      });
    }
  }

  /**
   * Get notification by ID
   * GET /api/notifications/:id
   */
  async getNotificationById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationService.getNotificationById(id, userId);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch notification',
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/notifications/:id/read
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      if (!notification) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read',
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/read-all
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      await notificationService.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark all as read',
      });
    }
  }

  /**
   * Delete notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const deleted = await notificationService.deleteNotification(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Notification not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete notification',
      });
    }
  }

  /**
   * Delete all read notifications
   * DELETE /api/notifications/read
   */
  async deleteAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const count = await notificationService.deleteAllRead(userId);

      res.json({
        success: true,
        message: `Deleted ${count} read notifications`,
        data: { count },
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete read notifications',
      });
    }
  }

  /**
   * Delete all notifications
   * DELETE /api/notifications/all
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const count = await notificationService.deleteAll(userId);

      res.json({
        success: true,
        message: `Deleted ${count} notifications`,
        data: { count },
      });
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete all notifications',
      });
    }
  }

  /**
   * Send system announcement (admin only)
   * POST /api/notifications/announcement
   */
  async sendAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, priority } = req.body;

      if (!title || !message) {
        res.status(400).json({
          success: false,
          message: 'Title and message are required',
        });
        return;
      }

      const notifications = await notificationService.sendSystemAnnouncement(
        title,
        message,
        priority || NotificationPriority.NORMAL
      );

      res.json({
        success: true,
        message: `Announcement sent to ${notifications.length} users`,
        data: { count: notifications.length },
      });
    } catch (error) {
      console.error('Error sending announcement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send announcement',
      });
    }
  }
}

export default new NotificationController();
