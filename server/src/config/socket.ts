import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, JWTPayload } from '../utils/jwt.utils';

// Extend Socket interface to include user data
export interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

export const initializeSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const payload = verifyAccessToken(token);
      socket.user = payload;

      console.log(`✅ Socket authenticated: ${payload.email} (${socket.id})`);
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection event
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    console.log(`   User: ${socket.user?.email} (ID: ${socket.user?.userId})`);

    // Join user to their personal room
    if (socket.user) {
      socket.join(`user:${socket.user.userId}`);
      console.log(`   Joined personal room: user:${socket.user.userId}`);
    }

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      console.log(`   Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.log('✅ Socket.IO initialized');
  return io;
};

export default initializeSocketIO;
