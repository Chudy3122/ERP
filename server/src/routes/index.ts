import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Health check for API
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
