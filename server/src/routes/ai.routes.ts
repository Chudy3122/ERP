import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All AI routes require authentication
router.use(authMiddleware);

// POST /api/ai/chat - Send message to AI assistant
router.post('/chat', (req, res) => aiController.chat(req, res));

export default router;
