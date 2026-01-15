import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.get('/users', chatController.getChatUsers);

// Channel routes
router.get('/channels', chatController.getChannels);
router.post('/channels', chatController.createChannel);
router.post('/channels/direct', chatController.createDirectChannel);
router.get('/channels/:id', chatController.getChannelById);
router.get('/channels/:id/messages', chatController.getChannelMessages);
router.post('/channels/:id/members', chatController.addChannelMembers);
router.delete('/channels/:id/members/:userId', chatController.removeChannelMember);
router.delete('/channels/:id', chatController.deleteChannel);

export default router;
