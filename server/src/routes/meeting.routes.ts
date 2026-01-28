import { Router } from 'express';
import meetingController from '../controllers/meeting.controller';
import scheduledMeetingController from '../controllers/scheduledMeeting.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

// Scheduled meetings routes (must be before /:id routes)
router.get('/scheduled', scheduledMeetingController.getScheduledMeetings.bind(scheduledMeetingController));
router.post('/scheduled', scheduledMeetingController.createScheduledMeeting.bind(scheduledMeetingController));
router.get('/scheduled/upcoming', scheduledMeetingController.getUpcomingMeetings.bind(scheduledMeetingController));
router.get('/scheduled/:id', scheduledMeetingController.getScheduledMeetingById.bind(scheduledMeetingController));
router.put('/scheduled/:id', scheduledMeetingController.updateScheduledMeeting.bind(scheduledMeetingController));
router.delete('/scheduled/:id', scheduledMeetingController.deleteScheduledMeeting.bind(scheduledMeetingController));

// Create meeting
router.post('/', meetingController.createMeeting.bind(meetingController));

// Get my meetings
router.get('/my', meetingController.getMyMeetings.bind(meetingController));

// Get meeting by ID
router.get('/:id', meetingController.getMeetingById.bind(meetingController));

// Accept meeting invitation
router.post('/:id/accept', meetingController.acceptMeeting.bind(meetingController));

// Reject meeting invitation
router.post('/:id/reject', meetingController.rejectMeeting.bind(meetingController));

// Join meeting
router.post('/:id/join', meetingController.joinMeeting.bind(meetingController));

// Leave meeting
router.post('/:id/leave', meetingController.leaveMeeting.bind(meetingController));

// End meeting
router.post('/:id/end', meetingController.endMeeting.bind(meetingController));

export default router;
