import { Request, Response } from 'express';
import meetingService from '../services/meeting.service';
import { getIO } from '../config/socket';
import { emitMeetingInvitation } from '../sockets/meeting.socket';

export class MeetingController {
  /**
   * Create a new meeting
   * POST /api/meetings
   * Body: { title: string, description?: string, participant_ids: string[] }
   */
  async createMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { title, description, participant_ids } = req.body;

      if (!title || !participant_ids || !Array.isArray(participant_ids)) {
        res.status(400).json({
          success: false,
          message: 'Title and participant_ids array are required',
        });
        return;
      }

      const meeting = await meetingService.createMeeting(userId, {
        title,
        description,
        participant_ids,
      });

      // Emit WebSocket notification to all invited participants
      const io = getIO();
      meeting.participants.forEach((participant) => {
        if (participant.user_id !== userId && participant.status === 'invited') {
          emitMeetingInvitation(io, participant.user_id, {
            meeting_id: meeting.id,
            meeting_title: meeting.title,
            caller: {
              id: meeting.creator.id,
              first_name: meeting.creator.first_name,
              last_name: meeting.creator.last_name,
              avatar_url: (meeting.creator as any).avatar_url,
            },
            created_at: meeting.created_at.toISOString(),
          });
        }
      });

      res.status(201).json(meeting);
    } catch (error: any) {
      console.error('Create meeting error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create meeting',
      });
    }
  }

  /**
   * Get my meetings
   * GET /api/meetings/my
   */
  async getMyMeetings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const meetings = await meetingService.getMyMeetings(userId);
      res.status(200).json(meetings);
    } catch (error: any) {
      console.error('Get my meetings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get meetings',
      });
    }
  }

  /**
   * Get meeting by ID
   * GET /api/meetings/:id
   */
  async getMeetingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const meeting = await meetingService.getMeetingById(id);
      res.status(200).json(meeting);
    } catch (error: any) {
      console.error('Get meeting error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Meeting not found',
      });
    }
  }

  /**
   * Accept meeting invitation
   * POST /api/meetings/:id/accept
   */
  async acceptMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await meetingService.acceptMeeting(userId, id);
      res.status(200).json({ success: true, message: 'Meeting accepted' });
    } catch (error: any) {
      console.error('Accept meeting error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to accept meeting',
      });
    }
  }

  /**
   * Reject meeting invitation
   * POST /api/meetings/:id/reject
   */
  async rejectMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await meetingService.rejectMeeting(userId, id);
      res.status(200).json({ success: true, message: 'Meeting rejected' });
    } catch (error: any) {
      console.error('Reject meeting error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to reject meeting',
      });
    }
  }

  /**
   * Join meeting
   * POST /api/meetings/:id/join
   */
  async joinMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await meetingService.joinMeeting(userId, id);
      res.status(200).json({ success: true, message: 'Joined meeting' });
    } catch (error: any) {
      console.error('Join meeting error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to join meeting',
      });
    }
  }

  /**
   * Leave meeting
   * POST /api/meetings/:id/leave
   */
  async leaveMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await meetingService.leaveMeeting(userId, id);
      res.status(200).json({ success: true, message: 'Left meeting' });
    } catch (error: any) {
      console.error('Leave meeting error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to leave meeting',
      });
    }
  }

  /**
   * End meeting
   * POST /api/meetings/:id/end
   */
  async endMeeting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      await meetingService.endMeeting(userId, id);
      res.status(200).json({ success: true, message: 'Meeting ended' });
    } catch (error: any) {
      console.error('End meeting error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to end meeting',
      });
    }
  }
}

export default new MeetingController();
