import { Router } from 'express';
import { workLogController } from '../controllers/worklog.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Work log routes
router.post('/', workLogController.createWorkLog.bind(workLogController));
router.get('/', workLogController.getWorkLogs.bind(workLogController));
router.get('/my', workLogController.getMyWorkLogs.bind(workLogController));
router.get('/my/stats', workLogController.getMyTimeStats.bind(workLogController));
router.get('/my/daily', workLogController.getMyDailySummary.bind(workLogController));
router.get('/:id', workLogController.getWorkLogById.bind(workLogController));
router.put('/:id', workLogController.updateWorkLog.bind(workLogController));
router.delete('/:id', workLogController.deleteWorkLog.bind(workLogController));

export default router;
