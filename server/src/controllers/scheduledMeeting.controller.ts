import { Request, Response } from 'express';
import scheduledMeetingService from '../services/scheduledMeeting.service';
import { MeetingPlatform } from '../models/ScheduledMeeting.model';
import { getIO } from '../config/socket';
import notificationService from '../services/notification.service';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';

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

      // Notify all participants (except organizer). The created meeting object
      // doesn't include the creator relation, so look the organizer up directly.
      const organizer = await AppDataSource.getRepository(User).findOne({
        where: { id: userId },
        select: ['id', 'first_name', 'last_name', 'avatar_url'],
      });
      const organizerName = organizer ? `${organizer.first_name} ${organizer.last_name}` : 'Organizator';
      const io = getIO();

      for (const participantId of (meeting.participant_ids || [])) {
        if (participantId === userId) continue;

        // Real-time toast
        io.to(`user:${participantId}`).emit('notification:meeting_scheduled', {
          senderName: organizerName,
          senderAvatar: organizer?.avatar_url || null,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          scheduledDate: meeting.scheduled_date,
          scheduledTime: meeting.scheduled_time,
          platform: meeting.platform,
        });

        // DB notification (fire-and-forget)
        notificationService.notifyMeetingScheduled(
          participantId,
          organizerName,
          meeting.title,
          String(meeting.scheduled_date),
          meeting.scheduled_time,
          meeting.platform,
          meeting.id,
          userId
        ).catch(() => {});
      }

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
