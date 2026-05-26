import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import userStatusService from '../services/userStatus.service';
import { StatusType } from '../models/UserStatus.model';

interface UpdateStatusData {
  status: StatusType;
  custom_message?: string;
}

// Track all active socket IDs per user (supports multiple tabs)
const userSockets = new Map<string, Set<string>>();

// Grace-period timers: set offline only if user doesn't reconnect within 15s
const disconnectTimers = new Map<string, NodeJS.Timeout>();

const OFFLINE_GRACE_MS = 15_000;

export const setupStatusHandlers = (io: SocketIOServer) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;
    console.log(`🟢 Status handler connected: ${socket.user.email} (${socket.id})`);

    // ── Track socket ─────────────────────────────────────────────────────────
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId)!.add(socket.id);

    // Cancel any pending offline timer from a previous disconnect (page refresh)
    if (disconnectTimers.has(userId)) {
      clearTimeout(disconnectTimers.get(userId)!);
      disconnectTimers.delete(userId);
      console.log(`⏱️  Cancelled pending offline timer for ${socket.user.email}`);
    }

    // ── Restore / set status on connect ──────────────────────────────────────
    // Key rule: only set ONLINE if user was previously offline.
    // Preserve busy / away / in_meeting across page refreshes.
    userStatusService.getOrCreateStatus(userId).then(async (current) => {
      let finalStatus = current;

      if (current.status === StatusType.OFFLINE) {
        finalStatus = await userStatusService.setOnline(userId);
      }
      // else: keep whatever status the user had (busy, away, in_meeting, online)

      io.emit('status:user_status_changed', {
        userId,
        status: finalStatus.status,
        custom_message: finalStatus.custom_message,
        last_seen: finalStatus.last_seen,
      });
    }).catch((err) => console.error('Error restoring status on connect:', err));

    // ── Update status ─────────────────────────────────────────────────────────
    socket.on('status:update', async (data: UpdateStatusData) => {
      try {
        const { status, custom_message } = data;

        if (!Object.values(StatusType).includes(status)) {
          socket.emit('status:error', { message: 'Invalid status type' });
          return;
        }

        const updatedStatus = await userStatusService.updateStatus(userId, status, custom_message);

        io.emit('status:user_status_changed', {
          userId,
          status: updatedStatus.status,
          custom_message: updatedStatus.custom_message,
          last_seen: updatedStatus.last_seen,
        });

        socket.emit('status:updated', {
          status: updatedStatus.status,
          custom_message: updatedStatus.custom_message,
        });

        console.log(`   Status ${socket.user!.email} → ${status}`);
      } catch (error) {
        console.error('Error updating status:', error);
        socket.emit('status:error', { message: 'Failed to update status' });
      }
    });

    // ── Get own status ────────────────────────────────────────────────────────
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

    // ── Batch statuses ────────────────────────────────────────────────────────
    socket.on('status:get_batch', async (data: { userIds: string[] }) => {
      try {
        if (!Array.isArray(data.userIds)) {
          socket.emit('status:error', { message: 'userIds must be an array' });
          return;
        }
        const statuses = await userStatusService.getMultipleStatuses(data.userIds);
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

    // ── All active users ──────────────────────────────────────────────────────
    socket.on('status:get_online_users', async () => {
      try {
        const activeUsers = await userStatusService.getActiveUsers();
        socket.emit('status:online_users', {
          users: activeUsers.map((s) => ({
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

    // ── Heartbeat ─────────────────────────────────────────────────────────────
    socket.on('status:heartbeat', async () => {
      try {
        await userStatusService.updateLastSeen(userId);
      } catch (error) {
        console.error('Error updating last seen:', error);
      }
    });

    // ── Disconnect with grace period ──────────────────────────────────────────
    socket.on('disconnect', () => {
      // Remove this socket from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }

      // Still has other sockets open (other tabs) → don't touch status
      if (userSockets.has(userId) && userSockets.get(userId)!.size > 0) {
        console.log(`🔌 Socket ${socket.id} closed, but user ${socket.user!.email} still has ${userSockets.get(userId)!.size} tab(s) open`);
        return;
      }

      // Last socket gone — start grace period before setting offline
      // If user refreshes the page, the new socket will cancel this timer
      console.log(`⏳ Last socket closed for ${socket.user!.email}, offline in ${OFFLINE_GRACE_MS / 1000}s...`);

      const timer = setTimeout(async () => {
        disconnectTimers.delete(userId);
        try {
          const status = await userStatusService.setOffline(userId);
          io.emit('status:user_status_changed', {
            userId,
            status: status.status,
            custom_message: status.custom_message,
            last_seen: status.last_seen,
          });
          console.log(`🔴 ${socket.user!.email} set offline after grace period`);
        } catch (err) {
          console.error('Error setting offline after grace period:', err);
        }
      }, OFFLINE_GRACE_MS);

      disconnectTimers.set(userId, timer);
    });
  });
};
