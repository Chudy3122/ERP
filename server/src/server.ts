import 'reflect-metadata';
import app from './app';
import { initializeDatabase, closeDatabase } from './config/database';

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await initializeDatabase();

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║   ERP Server Started Successfully!       ║
╠═══════════════════════════════════════════╣
║   Environment: ${process.env.NODE_ENV || 'development'}
║   Port: ${PORT}
║   URL: http://localhost:${PORT}
║   Health Check: http://localhost:${PORT}/health
║   API Documentation: http://localhost:${PORT}/api
╚═══════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} signal received: closing HTTP server`);
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default server;
