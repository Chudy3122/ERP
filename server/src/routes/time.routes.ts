import { Router } from 'express';
import timeController from '../controllers/time.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { UserRole } from '../models/User.model';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ===== TIME ENTRIES =====

// Clock in/out (legacy kept)
router.post('/clock-in', timeController.clockIn.bind(timeController));
router.post('/clock-out', timeController.clockOut.bind(timeController));

// New state-machine endpoints
router.get('/day-status', timeController.getDayStatus.bind(timeController));
router.post('/pause', timeController.pauseWork.bind(timeController));
router.post('/end-work', timeController.endWork.bind(timeController));
// Completed manual entry (od–do) — admin/kadry only, may target any employee
router.post(
  '/manual-entry',
  roleMiddleware([UserRole.ADMIN, UserRole.KADRY]),
  timeController.addManualEntry.bind(timeController)
);

// Get current entry
router.get('/current', timeController.getCurrentEntry.bind(timeController));

// Get user's time entries
router.get('/entries', timeController.getUserTimeEntries);

// Get statistics
router.get('/stats', timeController.getUserTimeStats);

// Get attendance overview (all users, last N days)
router.get('/attendance', timeController.getAttendance.bind(timeController));

// Get all entries (admin/kadry = everyone, kierownik = own department)
router.get(
  '/entries/all',
  roleMiddleware([UserRole.ADMIN, UserRole.KADRY, UserRole.KIEROWNIK]),
  timeController.getAllTimeEntries
);

// Update entry notes (owner)
router.put('/entries/:id/notes', timeController.updateEntryNotes.bind(timeController));

// Approve/reject time entries (admin/kierownik only)
router.put(
  '/entries/:id/approve',
  roleMiddleware([UserRole.ADMIN, UserRole.KIEROWNIK]),
  timeController.approveTimeEntry
);
router.put(
  '/entries/:id/reject',
  roleMiddleware([UserRole.ADMIN, UserRole.KIEROWNIK]),
  timeController.rejectTimeEntry
);

// Edit / delete a time entry — owner (their own) or admin (any); enforced in service
router.put('/entries/:id', timeController.updateTimeEntry.bind(timeController));
router.delete('/entries/:id', timeController.deleteTimeEntry.bind(timeController));

// ===== LEAVE REQUESTS =====

// Create leave request
router.post('/leave', timeController.createLeaveRequest);

// Get user's leave requests
router.get('/leave', timeController.getUserLeaveRequests);

// Get leave balance
router.get('/leave/balance', timeController.getUserLeaveBalance);

// Cancel leave request
router.delete('/leave/:id', timeController.cancelLeaveRequest);

// Leave request comments (owner or manager — enforced in service)
router.get('/leave/:id/comments', timeController.getLeaveComments.bind(timeController));
router.post('/leave/:id/comments', timeController.addLeaveComment.bind(timeController));

// Roles allowed to manage (approve/reject/revert) leave requests
const LEAVE_MANAGER_ROLES = [UserRole.ADMIN, UserRole.KIEROWNIK, UserRole.KADRY, UserRole.SZEF];

// Leave plan management (yearly limits + carry-over) — admin + kadry (ksiegowosc)
const LEAVE_PLAN_ROLES = [UserRole.ADMIN, UserRole.KADRY];
router.get(
  '/leave/overview',
  roleMiddleware(LEAVE_PLAN_ROLES),
  timeController.getLeaveOverview.bind(timeController)
);
router.put(
  '/leave/allocation/:userId',
  roleMiddleware(LEAVE_PLAN_ROLES),
  timeController.updateLeaveAllocation.bind(timeController)
);

// Get pending leave requests (managers only)
router.get(
  '/leave/pending',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.getPendingLeaveRequests
);

// Get all manageable leave requests — pending + reviewed (managers only)
router.get(
  '/leave/manageable',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.getManageableLeaveRequests.bind(timeController)
);

// All leave requests for all users — admin + kadry
router.get(
  '/leave/all',
  roleMiddleware([UserRole.ADMIN, UserRole.KADRY]),
  timeController.getAllLeaveRequests.bind(timeController)
);

// Monthly evidence report for one employee — admin + kadry
router.get(
  '/report/monthly',
  roleMiddleware([UserRole.ADMIN, UserRole.KADRY]),
  timeController.getMonthlyReport.bind(timeController)
);

// Approve/reject leave requests (managers only)
router.put(
  '/leave/:id/approve',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.approveLeaveRequest
);
router.put(
  '/leave/:id/reject',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.rejectLeaveRequest
);
// Revert a reviewed request back to pending (managers only)
router.put(
  '/leave/:id/revert',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.revertLeaveRequest
);
// Force-cancel any leave request (managers only)
router.put(
  '/leave/:id/cancel',
  roleMiddleware(LEAVE_MANAGER_ROLES),
  timeController.adminCancelLeaveRequest
);

// Permanently delete a leave request (admin only)
router.delete(
  '/leave/:id/hard',
  roleMiddleware([UserRole.ADMIN]),
  timeController.deleteLeaveRequest.bind(timeController)
);

export default router;
