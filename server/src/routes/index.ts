import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import fileRoutes from './file.routes';
import timeRoutes from './time.routes';
import userStatusRoutes from './userStatus.routes';
import notificationRoutes from './notification.routes';
import notificationPreferenceRoutes from './notificationPreference.routes';
import adminRoutes from './admin.routes';
import reportRoutes from './report.routes';
import calendarRoutes from './calendar.routes';
import meetingRoutes from './meeting.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import ticketRoutes from './ticket.routes';
import activityRoutes from './activity.routes';
import aiRoutes from './ai.routes';
// import employeeRoutes from './employee.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Chat routes
router.use('/chat', chatRoutes);

// File routes
router.use('/files', fileRoutes);

// Time management routes
router.use('/time', timeRoutes);

// User status routes
router.use('/status', userStatusRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Notification preference routes
router.use('/notification-preferences', notificationPreferenceRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Calendar routes
router.use('/calendar', calendarRoutes);

// Meeting routes
router.use('/meetings', meetingRoutes);

// Project management routes
router.use('/projects', projectRoutes);

// Task routes
router.use('/tasks', taskRoutes);

// Ticket routes
router.use('/tickets', ticketRoutes);

// Activity routes
router.use('/activities', activityRoutes);

// AI Assistant routes
router.use('/ai', aiRoutes);

// Employee routes (temporarily disabled - needs model updates)
// router.use('/employees', employeeRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
