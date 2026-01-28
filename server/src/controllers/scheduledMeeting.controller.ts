import { Request, Response } from 'express';
import scheduledMeetingService from '../services/scheduledMeeting.service';
import { MeetingPlatform } from '../models/ScheduledMeeting.model';

export class ScheduledMeetingController {
  /**
   * Create a new scheduled meeting
   * POST /api/meetings/scheduled
   */
  async createScheduledMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const {
        title,
        description,
        platform,
        meeting_link,
        scheduled_date,
        scheduled_time,
        duration_minutes,
        participant_ids,
      } = req.body;

      if (!title || !scheduled_date || !scheduled_time) {
        res.status(400).json({ message: 'Tytuł, data i godzina są wymagane' });
        return;
      }

      const meeting = await scheduledMeetingService.createScheduledMeeting(userId, {
        title,
        description,
        platform: platform as MeetingPlatform,
        meeting_link,
        scheduled_date,
        scheduled_time,
        duration_minutes: duration_minutes || 60,
        participant_ids: participant_ids || [],
      });

      res.status(201).json(meeting);
    } catch (error: any) {
      console.error('Error creating scheduled meeting:', error);
      res.status(500).json({ message: error.message || 'Nie udało się utworzyć spotkania' });
    }
  }

  /**
   * Get all scheduled meetings for the user
   * GET /api/meetings/scheduled
   */
  async getScheduledMeetings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const meetings = await scheduledMeetingService.getUserScheduledMeetings(userId);
      res.json(meetings);
    } catch (error: any) {
      console.error('Error getting scheduled meetings:', error);
      res.status(500).json({ message: error.message || 'Nie udało się pobrać spotkań' });
    }
  }

  /**
   * Get upcoming scheduled meetings
   * GET /api/meetings/scheduled/upcoming
   */
  async getUpcomingMeetings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const meetings = await scheduledMeetingService.getUpcomingMeetings(userId);
      res.json(meetings);
    } catch (error: any) {
      console.error('Error getting upcoming meetings:', error);
      res.status(500).json({ message: error.message || 'Nie udało się pobrać spotkań' });
    }
  }

  /**
   * Get scheduled meeting by ID
   * GET /api/meetings/scheduled/:id
   */
  async getScheduledMeetingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const meeting = await scheduledMeetingService.getScheduledMeetingById(id);

      if (!meeting) {
        res.status(404).json({ message: 'Spotkanie nie zostało znalezione' });
        return;
      }

      res.json(meeting);
    } catch (error: any) {
      console.error('Error getting scheduled meeting:', error);
      res.status(500).json({ message: error.message || 'Nie udało się pobrać spotkania' });
    }
  }

  /**
   * Update a scheduled meeting
   * PUT /api/meetings/scheduled/:id
   */
  async updateScheduledMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updateData = req.body;

      const meeting = await scheduledMeetingService.updateScheduledMeeting(id, userId, updateData);
      res.json(meeting);
    } catch (error: any) {
      console.error('Error updating scheduled meeting:', error);
      res.status(error.message.includes('uprawnień') ? 403 : 500).json({
        message: error.message || 'Nie udało się zaktualizować spotkania',
      });
    }
  }

  /**
   * Delete a scheduled meeting
   * DELETE /api/meetings/scheduled/:id
   */
  async deleteScheduledMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await scheduledMeetingService.deleteScheduledMeeting(id, userId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting scheduled meeting:', error);
      res.status(error.message.includes('uprawnień') ? 403 : 500).json({
        message: error.message || 'Nie udało się usunąć spotkania',
      });
    }
  }
}

export default new ScheduledMeetingController();
