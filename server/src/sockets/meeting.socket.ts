import { Server, Socket } from 'socket.io';

export const setupMeetingHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;

    if (!userId) {
      return;
    }

    console.log(`User ${userId} connected for meeting notifications`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from meeting notifications`);
    });
  });
};

/**
 * Emit meeting invitation to specific user
 */
export const emitMeetingInvitation = (
  io: Server,
  userId: string,
  meetingData: {
    meeting_id: string;
    meeting_title: string;
    caller: {
      id: string;
      first_name: string;
      last_name: string;
      avatar_url?: string;
    };
    created_at: string;
  }
) => {
  io.to(`user:${userId}`).emit('meeting:invitation', meetingData);
  console.log(`Sent meeting invitation to user ${userId} for meeting ${meetingData.meeting_id}`);
};

/**
 * Emit meeting status update to all participants
 */
export const emitMeetingStatusUpdate = (
  io: Server,
  participantIds: string[],
  meetingId: string,
  status: 'scheduled' | 'active' | 'ended'
) => {
  participantIds.forEach((userId) => {
    io.to(`user:${userId}`).emit('meeting:statusUpdate', {
      meeting_id: meetingId,
      status,
    });
  });
  console.log(`Sent status update for meeting ${meetingId}: ${status}`);
};

/**
 * Emit participant joined notification
 */
export const emitParticipantJoined = (
  io: Server,
  participantIds: string[],
  meetingId: string,
  user: {
    id: string;
    first_name: string;
    last_name: string;
  }
) => {
  participantIds.forEach((userId) => {
    if (userId !== user.id) {
      io.to(`user:${userId}`).emit('meeting:participantJoined', {
        meeting_id: meetingId,
        user,
      });
    }
  });
};

/**
 * Emit participant left notification
 */
export const emitParticipantLeft = (
  io: Server,
  participantIds: string[],
  meetingId: string,
  user: {
    id: string;
    first_name: string;
    last_name: string;
  }
) => {
  participantIds.forEach((userId) => {
    if (userId !== user.id) {
      io.to(`user:${userId}`).emit('meeting:participantLeft', {
        meeting_id: meetingId,
        user,
      });
    }
  });
};
