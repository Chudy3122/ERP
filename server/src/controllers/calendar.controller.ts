import { Request, Response } from 'express';
import calendarService from '../services/calendar.service';

export class CalendarController {
  /**
   * Get team calendar events
   * GET /api/calendar/team?startDate=...&endDate=...
   */
  async getTeamCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const events = await calendarService.getTeamCalendarEvents(start, end);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      console.error('Get team calendar error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get team calendar events',
      });
    }
  }

  /**
   * Get team availability
   * GET /api/calendar/availability?startDate=...&endDate=...
   */
  async getTeamAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date();
      const end = endDate
        ? new Date(endDate as string)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const availability = await calendarService.getTeamAvailability(start, end);

      res.status(200).json({
        success: true,
        data: availability,
      });
    } catch (error: any) {
      console.error('Get team availability error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get team availability',
      });
    }
  }

  /**
   * Get user calendar events
   * GET /api/calendar/user/:userId?startDate=...&endDate=...
   */
  async getUserCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const events = await calendarService.getUserCalendarEvents(userId, start, end);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      console.error('Get user calendar error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user calendar events',
      });
    }
  }

  /**
   * Get my calendar events
   * GET /api/calendar/my?startDate=...&endDate=...
   */
  async getMyCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const events = await calendarService.getUserCalendarEvents(userId, start, end);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      console.error('Get my calendar error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get calendar events',
      });
    }
  }
}

export default new CalendarController();
