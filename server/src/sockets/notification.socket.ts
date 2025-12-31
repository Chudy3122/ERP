import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import notificationService from '../services/notification.service';

export const setupNotificationHandlers = (io: SocketIOServer) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;

    console.log(`🔔 Setting up notification handlers for user: ${socket.user.email}`);

    // Get unread notifications count
    socket.on('notifications:get_unread_count', async () => {
      try {
        const count = await notificationService.getUnreadCount(userId);

        socket.emit('notifications:unread_count', { count });
      } catch (error) {
        console.error('Error fetching unread count:', error);
        socket.emit('notifications:error', { message: 'Failed to fetch unread count' });
      }
    });

    // Get recent notifications
    socket.on('notifications:get_recent', async (data: { limit?: number }) => {
      try {
        const limit = data?.limit || 10;
        const result = await notificationService.getUserNotifications(userId, 1, limit);

        socket.emit('notifications:recent', {
          notifications: result.notifications,
          total: result.total,
        });
      } catch (error) {
        console.error('Error fetching recent notifications:', error);
        socket.emit('notifications:error', { message: 'Failed to fetch notifications' });
      }
    });

    // Mark notification as read
    socket.on('notifications:mark_read', async (data: { notificationId: string }) => {
      try {
        const { notificationId } = data;

        const notification = await notificationService.markAsRead(notificationId, userId);

        if (!notification) {
          socket.emit('notifications:error', { message: 'Notification not found' });
          return;
        }

        socket.emit('notifications:marked_read', { notificationId });

        // Update unread count
        const count = await notificationService.getUnreadCount(userId);
        socket.emit('notifications:unread_count', { count });
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('notifications:error', { message: 'Failed to mark as read' });
      }
    });

    // Mark all as read
    socket.on('notifications:mark_all_read', async () => {
      try {
        await notificationService.markAllAsRead(userId);

        socket.emit('notifications:all_marked_read');
        socket.emit('notifications:unread_count', { count: 0 });
      } catch (error) {
        console.error('Error marking all as read:', error);
        socket.emit('notifications:error', { message: 'Failed to mark all as read' });
      }
    });

    // Delete notification
    socket.on('notifications:delete', async (data: { notificationId: string }) => {
      try {
        const { notificationId } = data;

        const deleted = await notificationService.deleteNotification(notificationId, userId);

        if (!deleted) {
          socket.emit('notifications:error', { message: 'Notification not found' });
          return;
        }

        socket.emit('notifications:deleted', { notificationId });

        // Update unread count
        const count = await notificationService.getUnreadCount(userId);
        socket.emit('notifications:unread_count', { count });
      } catch (error) {
        console.error('Error deleting notification:', error);
        socket.emit('notifications:error', { message: 'Failed to delete notification' });
      }
    });
  });
};

/**
 * Helper function to emit notification to specific user
 * Can be called from other services
 */
export const emitNotificationToUser = (
  io: SocketIOServer,
  userId: string,
  notification: any
) => {
  io.to(`user:${userId}`).emit('notifications:new', notification);
};

/**
 * Helper function to broadcast notification to all users
 * Used for system announcements
 */
export const broadcastNotification = (io: SocketIOServer, notification: any) => {
  io.emit('notifications:announcement', notification);
};
