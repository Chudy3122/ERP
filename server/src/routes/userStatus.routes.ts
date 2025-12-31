import { Router } from 'express';
import userStatusController from '../controllers/userStatus.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get current user's status
router.get('/me', userStatusController.getMyStatus);

// Update current user's status
router.put('/me', userStatusController.updateMyStatus);

// Quick status setters
router.post('/online', userStatusController.setOnline);
router.post('/offline', userStatusController.setOffline);
router.post('/away', userStatusController.setAway);
router.post('/busy', userStatusController.setBusy);
router.post('/in-meeting', userStatusController.setInMeeting);

// Get other users' statuses
router.get('/user/:userId', userStatusController.getUserStatus);
router.post('/batch', userStatusController.getBatchStatuses);

// Get all online users
router.get('/online', userStatusController.getOnlineUsers);

// Get status statistics
router.get('/stats', userStatusController.getStatusStats);

export default router;
