import { Router } from 'express';
import bossCalendarController from '../controllers/boss-calendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);

const canEdit = requireRole([UserRole.SZEF, UserRole.SEKRETARIAT, UserRole.ADMIN, UserRole.KIEROWNIK]);
// Marking a meeting as finished is limited to the boss, secretariat and admins
const canComplete = requireRole([UserRole.SZEF, UserRole.SEKRETARIAT, UserRole.ADMIN]);

router.get('/', bossCalendarController.getByRange.bind(bossCalendarController));
router.post('/', canEdit, bossCalendarController.create.bind(bossCalendarController));
router.put('/:id', canEdit, bossCalendarController.update.bind(bossCalendarController));
router.patch('/:id/complete', canComplete, bossCalendarController.setCompleted.bind(bossCalendarController));
router.delete('/:id', canEdit, bossCalendarController.delete.bind(bossCalendarController));

export default router;
