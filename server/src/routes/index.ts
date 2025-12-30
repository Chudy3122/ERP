import { Router } from 'express';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import fileRoutes from './file.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Chat routes
router.use('/chat', chatRoutes);

// File routes
router.use('/files', fileRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
