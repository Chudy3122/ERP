import { Router } from 'express';
import personalCalendarController from '../controllers/personalCalendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);
// Personal calendar is admin-only for now (pilot).
router.use(requireRole([UserRole.ADMIN]));

router.get('/', personalCalendarController.list);
router.post('/', personalCalendarController.create);
router.put('/:id', personalCalendarController.update);
router.delete('/:id', personalCalendarController.delete);

export default router;
