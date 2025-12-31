import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import userStatusService from '../services/userStatus.service';
import { StatusType } from '../models/UserStatus.model';

interface UpdateStatusData {
  status: StatusType;
  custom_message?: string;
}

export const setupStatusHandlers = (io: SocketIOServer) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;

    console.log(`🟢 Setting up status handlers for user: ${socket.user.email}`);

    // Set user online when they connect
    userStatusService.setOnline(userId).then((status) => {
      // Broadcast to all connected clients
      io.emit('status:user_status_changed', {
        userId,
        status: status.status,
        custom_message: status.custom_message,
        last_seen: status.last_seen,
      });
    });

    // Update user status
    socket.on('status:update', async (data: UpdateStatusData) => {
      try {
        const { status, custom_message } = data;

        // Validate status type
        if (!Object.values(StatusType).includes(status)) {
          socket.emit('status:error', { message: 'Invalid status type' });
          return;
        }

        const updatedStatus = await userStatusService.updateStatus(
          userId,
          status,
          custom_message
        );

        // Broadcast to all connected clients
        io.emit('status:user_status_changed', {
          userId,
          status: updatedStatus.status,
          custom_message: updatedStatus.custom_message,
          last_seen: updatedStatus.last_seen,
        });

        // Confirm to sender
        socket.emit('status:updated', {
          status: updatedStatus.status,
          custom_message: updatedStatus.custom_message,
        });

        console.log(`   User ${userId} status changed to: ${status}`);
      } catch (error) {
        console.error('Error updating status:', error);
        socket.emit('status:error', { message: 'Failed to update status' });
      }
    });

    // Get user's current status
    socket.on('status:get_my_status', async () => {
      try {
        const status = await userStatusService.getOrCreateStatus(userId);

        socket.emit('status:my_status', {
          status: status.status,
          custom_message: status.custom_message,
          last_seen: status.last_seen,
        });
      } catch (error) {
        console.error('Error fetching status:', error);
        socket.emit('status:error', { message: 'Failed to fetch status' });
      }
    });

    // Get multiple users' statuses
    socket.on('status:get_batch', async (data: { userIds: string[] }) => {
      try {
        const { userIds } = data;

        if (!Array.isArray(userIds)) {
          socket.emit('status:error', { message: 'userIds must be an array' });
          return;
        }

        const statuses = await userStatusService.getMultipleStatuses(userIds);

        socket.emit('status:batch_statuses', {
          statuses: statuses.map((s) => ({
            userId: s.user_id,
            status: s.status,
            custom_message: s.custom_message,
            last_seen: s.last_seen,
          })),
        });
      } catch (error) {
        console.error('Error fetching batch statuses:', error);
        socket.emit('status:error', { message: 'Failed to fetch statuses' });
      }
    });

    // Get all online users
    socket.on('status:get_online_users', async () => {
      try {
        const onlineUsers = await userStatusService.getOnlineUsers();

        socket.emit('status:online_users', {
          users: onlineUsers.map((s) => ({
            userId: s.user_id,
            status: s.status,
            custom_message: s.custom_message,
            user: s.user,
          })),
        });
      } catch (error) {
        console.error('Error fetching online users:', error);
        socket.emit('status:error', { message: 'Failed to fetch online users' });
      }
    });

    // Update last seen on activity
    socket.on('status:heartbeat', async () => {
      try {
        await userStatusService.updateLastSeen(userId);
      } catch (error) {
        console.error('Error updating last seen:', error);
      }
    });

    // Set user offline when they disconnect
    socket.on('disconnect', () => {
      userStatusService.setOffline(userId).then((status) => {
        // Broadcast to all connected clients
        io.emit('status:user_status_changed', {
          userId,
          status: status.status,
          custom_message: status.custom_message,
          last_seen: status.last_seen,
        });

        console.log(`🔴 User ${userId} disconnected, status set to offline`);
      });
    });
  });
};
