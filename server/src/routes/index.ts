import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import fileRoutes from './file.routes';
import timeRoutes from './time.routes';
import userStatusRoutes from './userStatus.routes';

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

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
