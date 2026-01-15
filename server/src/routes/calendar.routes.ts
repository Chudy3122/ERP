import { Router } from 'express';
import calendarController from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All calendar routes require authentication
router.use(authenticate);

// Get team calendar events
router.get('/team', calendarController.getTeamCalendarEvents.bind(calendarController));

// Get team availability
router.get('/availability', calendarController.getTeamAvailability.bind(calendarController));

// Get my calendar events
router.get('/my', calendarController.getMyCalendarEvents.bind(calendarController));

// Get specific user calendar events
router.get('/user/:userId', calendarController.getUserCalendarEvents.bind(calendarController));

export default router;
