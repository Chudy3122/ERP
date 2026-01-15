import { Meeting, MeetingStatus } from '../models/Meeting.model';
import { MeetingParticipant, ParticipantStatus } from '../models/MeetingParticipant.model';
import { User } from '../models/User.model';
import { In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

interface CreateMeetingData {
  title: string;
  description?: string;
  participant_ids: string[];
}

class MeetingService {
  /**
   * Create a new meeting with participants
   */
  async createMeeting(userId: string, data: CreateMeetingData): Promise<Meeting> {
    const { title, description, participant_ids } = data;

    // Generate unique room ID
    const room_id = `meeting-${uuidv4()}`;

    // Create meeting
    const meeting = Meeting.create({
      title,
      description,
      created_by: userId,
      room_id,
      status: MeetingStatus.SCHEDULED,
    });

    await meeting.save();

    // Add creator as participant
    const creatorParticipant = MeetingParticipant.create({
      meeting_id: meeting.id,
      user_id: userId,
      status: ParticipantStatus.ACCEPTED,
    });
    await creatorParticipant.save();

    // Add invited participants
    const participantPromises = participant_ids
      .filter((id) => id !== userId) // Don't add creator twice
      .map((user_id) =>
        MeetingParticipant.create({
          meeting_id: meeting.id,
          user_id,
          status: ParticipantStatus.INVITED,
        }).save()
      );

    await Promise.all(participantPromises);

    // Reload meeting with participants
    const fullMeeting = await Meeting.findOne({
      where: { id: meeting.id },
      relations: ['creator', 'participants', 'participants.user'],
    });

    if (!fullMeeting) {
      throw new Error('Failed to load created meeting');
    }

    return fullMeeting;
  }

  /**
   * Get all meetings for a user (as creator or participant)
   */
  async getMyMeetings(userId: string): Promise<Meeting[]> {
    // Get all participant records for this user
    const participantRecords = await MeetingParticipant.find({
      where: { user_id: userId },
      select: ['meeting_id'],
    });

    const meetingIds = participantRecords.map((p) => p.meeting_id);

    if (meetingIds.length === 0) {
      return [];
    }

    // Get meetings
    const meetings = await Meeting.find({
      where: { id: In(meetingIds) },
      relations: ['creator', 'participants', 'participants.user'],
      order: { created_at: 'DESC' },
    });

    return meetings;
  }

  /**
   * Get meeting by ID
   */
  async getMeetingById(meetingId: string): Promise<Meeting> {
    const meeting = await Meeting.findOne({
      where: { id: meetingId },
      relations: ['creator', 'participants', 'participants.user'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    return meeting;
  }

  /**
   * Accept meeting invitation
   */
  async acceptMeeting(userId: string, meetingId: string): Promise<void> {
    const participant = await MeetingParticipant.findOne({
      where: { meeting_id: meetingId, user_id: userId },
    });

    if (!participant) {
      throw new Error('You are not invited to this meeting');
    }

    participant.status = ParticipantStatus.ACCEPTED;
    await participant.save();
  }

  /**
   * Reject meeting invitation
   */
  async rejectMeeting(userId: string, meetingId: string): Promise<void> {
    const participant = await MeetingParticipant.findOne({
      where: { meeting_id: meetingId, user_id: userId },
    });

    if (!participant) {
      throw new Error('You are not invited to this meeting');
    }

    participant.status = ParticipantStatus.REJECTED;
    await participant.save();
  }

  /**
   * Join meeting (user enters the call)
   */
  async joinMeeting(userId: string, meetingId: string): Promise<void> {
    const participant = await MeetingParticipant.findOne({
      where: { meeting_id: meetingId, user_id: userId },
    });

    if (!participant) {
      throw new Error('You are not invited to this meeting');
    }

    const meeting = await Meeting.findOne({ where: { id: meetingId } });
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Update participant status
    participant.status = ParticipantStatus.IN_CALL;
    participant.joined_at = new Date();
    await participant.save();

    // If meeting is scheduled, mark as active
    if (meeting.status === MeetingStatus.SCHEDULED) {
      meeting.status = MeetingStatus.ACTIVE;
      meeting.started_at = new Date();
      await meeting.save();
    }
  }

  /**
   * Leave meeting (user exits the call)
   */
  async leaveMeeting(userId: string, meetingId: string): Promise<void> {
    const participant = await MeetingParticipant.findOne({
      where: { meeting_id: meetingId, user_id: userId },
    });

    if (!participant) {
      throw new Error('You are not in this meeting');
    }

    participant.left_at = new Date();
    participant.status = ParticipantStatus.ACCEPTED; // Back to accepted but not in call
    await participant.save();
  }

  /**
   * End meeting (only creator can do this)
   */
  async endMeeting(userId: string, meetingId: string): Promise<void> {
    const meeting = await Meeting.findOne({ where: { id: meetingId } });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.created_by !== userId) {
      throw new Error('Only the meeting creator can end the meeting');
    }

    meeting.status = MeetingStatus.ENDED;
    meeting.ended_at = new Date();
    await meeting.save();

    // Mark all participants as left
    const participants = await MeetingParticipant.find({
      where: { meeting_id: meetingId, status: ParticipantStatus.IN_CALL },
    });

    const updatePromises = participants.map((p) => {
      p.left_at = new Date();
      p.status = ParticipantStatus.ACCEPTED;
      return p.save();
    });

    await Promise.all(updatePromises);
  }
}

export default new MeetingService();
