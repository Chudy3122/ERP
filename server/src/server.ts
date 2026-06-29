import 'reflect-metadata';
import './types/index';
import { createServer } from 'http';
import app from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeSocketIO } from './config/socket';
import { setupChatHandlers } from './sockets/chat.socket';
import { setupStatusHandlers } from './sockets/status.socket';
import { setupNotificationHandlers } from './sockets/notification.socket';
import { setupMeetingHandlers } from './sockets/meeting.socket';
import { TimeService } from './services/time.service';
import scheduledMeetingService from './services/scheduledMeeting.service';
import personalCalendarService from './services/personalCalendar.service';
import fleetService from './services/fleet.service';
import { seedDepartments } from './database/seeds/seedDepartments';
import userStatusService from './services/userStatus.service';

const PORT = process.env.PORT || 5000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await initializeDatabase();
    await seedDepartments();

    // Reset stale user statuses to offline — nobody is connected right after boot
    // (handles crashes / Render spin-down where no disconnect event fired)
    try {
      const reset = await userStatusService.resetAllOffline();
      if (reset > 0) console.log(`🔄 Reset ${reset} stale user status(es) to offline on startup`);
    } catch (err) {
      console.error('Failed to reset stale statuses on startup:', err);
    }

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = initializeSocketIO(httpServer);

    // Setup chat handlers
    setupChatHandlers(io);

    // Setup status handlers
    setupStatusHandlers(io);

    // Setup notification handlers
    setupNotificationHandlers(io);

    // Setup meeting handlers
    setupMeetingHandlers(io);

    // Auto clock-out after the user's etat hours is DISABLED — sessions run until
    // ended manually by the user (or admin/kadry). Scheduler intentionally removed.
    const timeService = new TimeService();

    // Leave rollover (Automat 1 stycznia) — idempotent: rolls over any missed
    // year-boundary. Runs on boot and once a day so it fires after New Year.
    await timeService.ensureLeaveRollover().catch(console.error);
    setInterval(() => timeService.ensureLeaveRollover().catch(console.error), 24 * 60 * 60 * 1000);

    // Scheduled-meeting ringer (best-effort) — rings/notifies participants when a
    // meeting starts. Only fires while the server is awake (free tier may sleep).
    setInterval(
      () => scheduledMeetingService.processDueScheduledMeetings().catch(console.error),
      30 * 1000
    );

    // Personal calendar reminders (best-effort) — fires bell reminders for upcoming
    // events. Only runs while the server is awake (free tier may sleep).
    setInterval(
      () => personalCalendarService.processDueReminders().catch(console.error),
      60 * 1000
    );

    // Vehicle deadline reminders (przeglądy/ubezpieczenia) — date-based, check hourly.
    fleetService.processDueVehicleReminders().catch(console.error);
    setInterval(
      () => fleetService.processDueVehicleReminders().catch(console.error),
      60 * 60 * 1000
    );

    // Auto-close forgotten work sessions for users with an auto_close limit (check every 5 min)
    timeService.autoCloseStaleWorkEntries().catch(console.error);
    setInterval(
      () => timeService.autoCloseStaleWorkEntries().catch(console.error),
      5 * 60 * 1000
    );

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
