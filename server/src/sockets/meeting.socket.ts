import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';

// WebRTC types for server-side signaling (simplified versions of browser types)
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

// Store room participants for WebRTC
const roomParticipants = new Map<string, Map<string, { socketId: string; userName: string }>>();

export const setupMeetingHandlers = (io: Server) => {
  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      return;
    }

    const userId = socket.user.userId;

    console.log(`User ${socket.user.email} connected for meeting notifications`);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // =====================
    // WebRTC Signaling
    // =====================

    // Join a WebRTC room
    socket.on('webrtc:join-room', (data: { roomId: string; userId: string; userName: string }) => {
      const { roomId, userName: participantName } = data;

      console.log(`User ${participantName} (${userId}) joining WebRTC room: ${roomId}`);

      // Add to room participants
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }
      const participants = roomParticipants.get(roomId)!;

      // Notify existing participants about new user
      participants.forEach((participant, participantId) => {
        io.to(participant.socketId).emit('webrtc:user-joined', {
          userId,
          userName: participantName,
        });
      });

      // Add new participant
      participants.set(userId, { socketId: socket.id, userName: participantName });

      // Join socket room
      socket.join(`webrtc:${roomId}`);

      console.log(`Room ${roomId} now has ${participants.size} participants`);
    });

    // Leave a WebRTC room
    socket.on('webrtc:leave-room', (data: { roomId: string; userId: string }) => {
      const { roomId } = data;
      handleUserLeaveRoom(io, socket, userId, roomId);
    });

    // Forward WebRTC offer
    socket.on('webrtc:offer', (data: { roomId: string; targetUserId: string; offer: RTCSessionDescriptionInit }) => {
      const { roomId, targetUserId, offer } = data;
      const participants = roomParticipants.get(roomId);
      const targetParticipant = participants?.get(targetUserId);

      if (targetParticipant) {
        const senderName = participants?.get(userId)?.userName || 'Unknown';
        io.to(targetParticipant.socketId).emit('webrtc:offer', {
          fromUserId: userId,
          fromUserName: senderName,
          offer,
        });
        console.log(`Forwarded offer from ${userId} to ${targetUserId}`);
      }
    });

    // Forward WebRTC answer
    socket.on('webrtc:answer', (data: { roomId: string; targetUserId: string; answer: RTCSessionDescriptionInit }) => {
      const { roomId, targetUserId, answer } = data;
      const participants = roomParticipants.get(roomId);
      const targetParticipant = participants?.get(targetUserId);

      if (targetParticipant) {
        io.to(targetParticipant.socketId).emit('webrtc:answer', {
          fromUserId: userId,
          answer,
        });
        console.log(`Forwarded answer from ${userId} to ${targetUserId}`);
      }
    });

    // Forward ICE candidate
    socket.on('webrtc:ice-candidate', (data: { roomId: string; targetUserId: string; candidate: RTCIceCandidateInit }) => {
      const { roomId, targetUserId, candidate } = data;
      const participants = roomParticipants.get(roomId);
      const targetParticipant = participants?.get(targetUserId);

      if (targetParticipant) {
        io.to(targetParticipant.socketId).emit('webrtc:ice-candidate', {
          fromUserId: userId,
          candidate,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.email} disconnected from meeting notifications`);

      // Remove from all WebRTC rooms
      roomParticipants.forEach((participants, roomId) => {
        if (participants.has(userId)) {
          handleUserLeaveRoom(io, socket, userId, roomId);
        }
      });
    });
  });
};

// Helper function to handle user leaving room
function handleUserLeaveRoom(io: Server, socket: AuthenticatedSocket, userId: string, roomId: string) {
  const participants = roomParticipants.get(roomId);

  if (participants && participants.has(userId)) {
    const userName = participants.get(userId)?.userName || 'Unknown';
    participants.delete(userId);

    // Leave socket room
    socket.leave(`webrtc:${roomId}`);

    // Notify remaining participants
    participants.forEach((participant) => {
      io.to(participant.socketId).emit('webrtc:user-left', { userId });
    });

    console.log(`User ${userName} (${userId}) left WebRTC room: ${roomId}`);

    // Clean up empty rooms
    if (participants.size === 0) {
      roomParticipants.delete(roomId);
      console.log(`Room ${roomId} is now empty and removed`);
    }
  }
}

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
