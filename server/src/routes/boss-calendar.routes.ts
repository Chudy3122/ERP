import { Router } from 'express';
import bossCalendarController from '../controllers/boss-calendar.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, requireBossCalendarEditor } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

router.use(authenticate);

// Editor roles, plus anyone individually flagged with can_edit_boss_calendar.
const canEdit = requireBossCalendarEditor();
// Marking a meeting as finished is limited to the boss, secretariat and admins
const canComplete = requireRole([UserRole.SZEF, UserRole.SEKRETARIAT, UserRole.ADMIN]);

router.get('/', bossCalendarController.getByRange.bind(bossCalendarController));
router.post('/', canEdit, bossCalendarController.create.bind(bossCalendarController));
router.put('/:id', canEdit, bossCalendarController.update.bind(bossCalendarController));
router.patch('/:id/complete', canComplete, bossCalendarController.setCompleted.bind(bossCalendarController));
router.delete('/:id', canEdit, bossCalendarController.delete.bind(bossCalendarController));

export default router;
