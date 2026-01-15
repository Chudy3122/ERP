import { Router } from 'express';
import activityController from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Activity queries
router.get('/recent', activityController.getRecentActivities.bind(activityController));
router.get('/my', activityController.getUserActivities.bind(activityController));
router.get('/feed', activityController.getActivityFeed.bind(activityController));
router.get('/project/:projectId', activityController.getProjectActivities.bind(activityController));
router.get('/type/:entityType', activityController.getActivitiesByEntityType.bind(activityController));

export default router;
