import { Router } from 'express';
import { projectStageController } from '../controllers/projectStage.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Project stage routes
router.post(
  '/projects/:projectId/stages',
  projectStageController.createStage.bind(projectStageController)
);

router.get(
  '/projects/:projectId/stages',
  projectStageController.getProjectStages.bind(projectStageController)
);

router.get(
  '/stages/:stageId',
  projectStageController.getStageById.bind(projectStageController)
);

router.put(
  '/stages/:stageId',
  projectStageController.updateStage.bind(projectStageController)
);

router.delete(
  '/stages/:stageId',
  projectStageController.deleteStage.bind(projectStageController)
);

router.post(
  '/projects/:projectId/stages/reorder',
  projectStageController.reorderStages.bind(projectStageController)
);

router.post(
  '/projects/:projectId/stages/default',
  projectStageController.createDefaultStages.bind(projectStageController)
);

router.get(
  '/projects/:projectId/tasks-by-stages',
  projectStageController.getTasksByStages.bind(projectStageController)
);

router.put(
  '/tasks/:taskId/move-to-stage',
  projectStageController.moveTaskToStage.bind(projectStageController)
);

export default router;
