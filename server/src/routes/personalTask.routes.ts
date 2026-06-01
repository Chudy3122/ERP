import { Router } from 'express';
import personalTaskController from '../controllers/personalTask.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// All routes are scoped to the logged-in user inside the service
router.get('/', personalTaskController.getAll);
router.post('/', personalTaskController.create);
router.put('/reorder', personalTaskController.reorder);
router.put('/:id', personalTaskController.update);
router.delete('/:id', personalTaskController.delete);

export default router;
