import { Router } from 'express';
import timeController from '../controllers/time.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ===== TIME ENTRIES =====

// Clock in/out
router.post('/clock-in', timeController.clockIn);
router.post('/clock-out', timeController.clockOut);

// Get current entry
router.get('/current', timeController.getCurrentEntry);

// Get user's time entries
router.get('/entries', timeController.getUserTimeEntries);

// Get statistics
router.get('/stats', timeController.getUserTimeStats);

// Get all entries (admin/team_leader only)
router.get(
  '/entries/all',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.getAllTimeEntries
);

// Approve/reject time entries (admin/team_leader only)
router.put(
  '/entries/:id/approve',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.approveTimeEntry
);
router.put(
  '/entries/:id/reject',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.rejectTimeEntry
);

// ===== LEAVE REQUESTS =====

// Create leave request
router.post('/leave', timeController.createLeaveRequest);

// Get user's leave requests
router.get('/leave', timeController.getUserLeaveRequests);

// Get leave balance
router.get('/leave/balance', timeController.getUserLeaveBalance);

// Cancel leave request
router.delete('/leave/:id', timeController.cancelLeaveRequest);

// Get pending leave requests (admin/team_leader only)
router.get(
  '/leave/pending',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.getPendingLeaveRequests
);

// Approve/reject leave requests (admin/team_leader only)
router.put(
  '/leave/:id/approve',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.approveLeaveRequest
);
router.put(
  '/leave/:id/reject',
  roleMiddleware([UserRole.ADMIN, UserRole.TEAM_LEADER]),
  timeController.rejectLeaveRequest
);

export default router;
