import { Router } from 'express';
import notificationPreferenceController from '../controllers/notificationPreference.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get my notification preferences
router.get('/', notificationPreferenceController.getMyPreferences.bind(notificationPreferenceController));

// Update my notification preferences
router.put('/', notificationPreferenceController.updateMyPreferences.bind(notificationPreferenceController));

// Reset preferences to default
router.post('/reset', notificationPreferenceController.resetPreferences.bind(notificationPreferenceController));

// Check DND status
router.get('/dnd-status', notificationPreferenceController.getDndStatus.bind(notificationPreferenceController));

export default router;
