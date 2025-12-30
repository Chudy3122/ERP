import 'reflect-metadata';
import { createServer } from 'http';
import app from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeSocketIO } from './config/socket';
import { setupChatHandlers } from './sockets/chat.socket';

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await initializeDatabase();

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = initializeSocketIO(httpServer);

    // Setup chat handlers
    setupChatHandlers(io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║   ERP Server Started Successfully!       ║
╠═══════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Port: ${PORT}
║   URL: http://localhost:${PORT}
║   Health Check: http://localhost:${PORT}/health
║   API Documentation: http://localhost:${PORT}/api
║   WebSocket: ws://localhost:${PORT}
╚═══════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} signal received: closing HTTP server`);

      // Close Socket.IO connections
      io.close(() => {
        console.log('Socket.IO server closed');
      });

      httpServer.close(async () => {
        console.log('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return httpServer;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default server;
