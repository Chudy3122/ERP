import { Router } from 'express';
import personalCalendarController from '../controllers/personalCalendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Personal calendar — available to all authenticated users (each sees only their own).
router.use(authenticate);

router.get('/', personalCalendarController.list);
router.post('/', personalCalendarController.create);
router.put('/:id', personalCalendarController.update);
router.delete('/:id', personalCalendarController.delete);

export default router;
