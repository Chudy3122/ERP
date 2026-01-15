import { Router } from 'express';
import notificationController from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's notifications
router.get('/', notificationController.getNotifications);

// Get unread notifications count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete all read notifications
router.delete('/read', notificationController.deleteAllRead);

// Delete all notifications
router.delete('/all', notificationController.deleteAll);

// Send system announcement (admin only)
router.post(
  '/announcement',
  roleMiddleware([UserRole.ADMIN]),
  notificationController.sendAnnouncement
);

// Get specific notification
router.get('/:id', notificationController.getNotificationById);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
