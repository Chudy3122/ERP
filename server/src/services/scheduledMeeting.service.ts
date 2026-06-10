import { Repository, MoreThanOrEqual, LessThan, IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { ScheduledMeeting, MeetingPlatform } from '../models/ScheduledMeeting.model';
import { User } from '../models/User.model';
import meetingService from './meeting.service';
import { getIO } from '../config/socket';
import { emitMeetingInvitation } from '../sockets/meeting.socket';

interface CreateScheduledMeetingDto {
  title: string;
  description?: string;
  platform: MeetingPlatform;
  meeting_link?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  participant_ids?: string[];
}

interface UpdateScheduledMeetingDto {
  title?: string;
  description?: string;
  platform?: MeetingPlatform;
  meeting_link?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  participant_ids?: string[];
}

export class ScheduledMeetingService {
  private scheduledMeetingRepository: Repository<ScheduledMeeting>;
  private userRepository: Repository<User>;

  constructor() {
    this.scheduledMeetingRepository = AppDataSource.getRepository(ScheduledMeeting);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Create a new scheduled meeting
   */
  async createScheduledMeeting(userId: string, data: CreateScheduledMeetingDto): Promise<any> {
    const meeting = this.scheduledMeetingRepository.create({
      title: data.title,
      description: data.description,
      platform: data.platform,
      meeting_link: data.meeting_link,
      scheduled_date: new Date(data.scheduled_date),
      scheduled_time: data.scheduled_time,
      duration_minutes: data.duration_minutes,
      created_by: userId,
      participant_ids: data.participant_ids || [],
    });

    const savedMeeting = await this.scheduledMeetingRepository.save(meeting);

    // Get participant names
    const participants = await this.getParticipantsInfo(savedMeeting.participant_ids || []);

    return {
      ...savedMeeting,
      scheduled_date: savedMeeting.scheduled_date.toISOString().split('T')[0],
      participants,
    };
  }

  /**
   * Get all scheduled meetings for a user (where they are creator or participant)
   */
  async getUserScheduledMeetings(userId: string): Promise<any[]> {
    const meetings = await this.scheduledMeetingRepository.find({
      order: { scheduled_date: 'ASC', scheduled_time: 'ASC' },
    });

    // Filter meetings where user is creator or participant
    const userMeetings = meetings.filter(
      (m) =>
        m.created_by === userId ||
        (m.participant_ids && m.participant_ids.includes(userId))
    );

    // Get participant names for all meetings
    const result = await Promise.all(
      userMeetings.map(async (meeting) => {
        const participants = await this.getParticipantsInfo(meeting.participant_ids || []);
        return {
          ...meeting,
          scheduled_date:
            meeting.scheduled_date instanceof Date
              ? meeting.scheduled_date.toISOString().split('T')[0]
              : meeting.scheduled_date,
          participants,
        };
      })
    );

    return result;
  }

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(userId: string): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meetings = await this.scheduledMeetingRepository.find({
      where: {
        scheduled_date: MoreThanOrEqual(today),
      },
      order: { scheduled_date: 'ASC', scheduled_time: 'ASC' },
    });

    // Filter meetings where user is creator or participant
    const userMeetings = meetings.filter(
      (m) =>
        m.created_by === userId ||
        (m.participant_ids && m.participant_ids.includes(userId))
    );

    const result = await Promise.all(
      userMeetings.map(async (meeting) => {
        const participants = await this.getParticipantsInfo(meeting.participant_ids || []);
        return {
          ...meeting,
          scheduled_date:
            meeting.scheduled_date instanceof Date
              ? meeting.scheduled_date.toISOString().split('T')[0]
              : meeting.scheduled_date,
          participants,
        };
      })
    );

    return result;
  }

  /**
   * Get meeting by ID
   */
  async getScheduledMeetingById(id: string): Promise<any | null> {
    const meeting = await this.scheduledMeetingRepository.findOne({
      where: { id },
    });

    if (!meeting) {
      return null;
    }

    const participants = await this.getParticipantsInfo(meeting.participant_ids || []);

    return {
      ...meeting,
      scheduled_date:
        meeting.scheduled_date instanceof Date
          ? meeting.scheduled_date.toISOString().split('T')[0]
          : meeting.scheduled_date,
      participants,
    };
  }

  /**
   * Update a scheduled meeting
   */
  async updateScheduledMeeting(id: string, userId: string, data: UpdateScheduledMeetingDto): Promise<any> {
    const meeting = await this.scheduledMeetingRepository.findOne({
      where: { id },
    });

    if (!meeting) {
      throw new Error('Spotkanie nie zostało znalezione');
    }

    // Only creator can update
    if (meeting.created_by !== userId) {
      throw new Error('Nie masz uprawnień do edycji tego spotkania');
    }

    if (data.title !== undefined) meeting.title = data.title;
    if (data.description !== undefined) meeting.description = data.description;
    if (data.platform !== undefined) meeting.platform = data.platform;
    if (data.meeting_link !== undefined) meeting.meeting_link = data.meeting_link;
    if (data.scheduled_date !== undefined) meeting.scheduled_date = new Date(data.scheduled_date);
    if (data.scheduled_time !== undefined) meeting.scheduled_time = data.scheduled_time;
    if (data.duration_minutes !== undefined) meeting.duration_minutes = data.duration_minutes;
    if (data.participant_ids !== undefined) meeting.participant_ids = data.participant_ids;

    const updatedMeeting = await this.scheduledMeetingRepository.save(meeting);
    const participants = await this.getParticipantsInfo(updatedMeeting.participant_ids || []);

    return {
      ...updatedMeeting,
      scheduled_date:
        updatedMeeting.scheduled_date instanceof Date
          ? updatedMeeting.scheduled_date.toISOString().split('T')[0]
          : updatedMeeting.scheduled_date,
      participants,
    };
  }

  /**
   * Delete a scheduled meeting
   */
  async deleteScheduledMeeting(id: string, userId: string): Promise<void> {
    const meeting = await this.scheduledMeetingRepository.findOne({
      where: { id },
    });

    if (!meeting) {
      throw new Error('Spotkanie nie zostało znalezione');
    }

    // Only creator can delete
    if (meeting.created_by !== userId) {
      throw new Error('Nie masz uprawnień do usunięcia tego spotkania');
    }

    await this.scheduledMeetingRepository.remove(meeting);
  }

  /**
   * Helper: Get participant info (id and name) for a list of user IDs
   */
  private async getParticipantsInfo(participantIds: string[]): Promise<{ id: string; name: string }[]> {
    if (!participantIds || participantIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: participantIds.map((id) => ({ id })),
      select: ['id', 'first_name', 'last_name'],
    });

    return users.map((user) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
    }));
  }

  /**
   * Convert a Europe/Warsaw wall-clock date + time to a UTC Date (DST-aware).
   */
  private warsawToUtc(dateStr: string, timeStr: string): Date {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, mi] = (timeStr || '00:00').split(':').map(Number);
    const utcGuess = Date.UTC(y, mo - 1, d, h, mi, 0);
    const asUtc = new Date(utcGuess);
    const warsaw = new Date(asUtc.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
    const utc = new Date(asUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
    return new Date(utcGuess - (warsaw.getTime() - utc.getTime()));
  }

  /**
   * Best-effort scheduler: when a scheduled meeting's start time arrives, ring
   * everyone. Internal meetings open a live WebRTC room + ring (incl. organizer);
   * external meetings get a "your meeting is starting" notification with a sound.
   * Idempotent via ring_sent_at. Rings up to 15 min late (e.g. after a server wake).
   */
  async processDueScheduledMeetings(): Promise<void> {
    const now = Date.now();
    const GRACE_MS = 15 * 60 * 1000;

    const pending = await this.scheduledMeetingRepository.find({ where: { ring_sent_at: IsNull() } });

    for (const meeting of pending) {
      const dateStr = meeting.scheduled_date instanceof Date
        ? meeting.scheduled_date.toISOString().split('T')[0]
        : String(meeting.scheduled_date);
      const startMs = this.warsawToUtc(dateStr, meeting.scheduled_time).getTime();

      if (now < startMs) continue; // not yet

      // Mark handled now so it never double-rings; only actually ring if within grace.
      meeting.ring_sent_at = new Date();
      await this.scheduledMeetingRepository.save(meeting);
      if (now > startMs + GRACE_MS) continue; // too late (server was asleep) — skip

      try {
        await this.ringDueMeeting(meeting);
      } catch (err) {
        console.error('Failed to ring scheduled meeting', meeting.id, err);
      }
    }
  }

  private async ringDueMeeting(meeting: ScheduledMeeting): Promise<void> {
    const io = getIO();
    const organizer = await this.userRepository.findOne({
      where: { id: meeting.created_by },
      select: ['id', 'first_name', 'last_name', 'avatar_url'],
    });
    const organizerName = organizer ? `${organizer.first_name} ${organizer.last_name}` : 'Organizator';
    const recipientIds = Array.from(new Set([meeting.created_by, ...(meeting.participant_ids || [])]));

    if (meeting.platform === MeetingPlatform.INTERNAL) {
      // Open a live room and ring everyone (including the organizer)
      const live = await meetingService.createMeeting(meeting.created_by, {
        title: meeting.title,
        description: meeting.description,
        participant_ids: meeting.participant_ids || [],
      });
      for (const userId of recipientIds) {
        emitMeetingInvitation(io, userId, {
          meeting_id: live.id,
          room_id: live.room_id,
          meeting_title: meeting.title,
          caller: {
            id: organizer?.id || meeting.created_by,
            first_name: organizer?.first_name || 'Spotkanie',
            last_name: organizer?.last_name || '',
            avatar_url: organizer?.avatar_url || undefined,
          },
          created_at: new Date().toISOString(),
        });
      }
    } else {
      // External — informational "starting now" notification (with link + sound)
      for (const userId of recipientIds) {
        io.to(`user:${userId}`).emit('meeting:external-starting', {
          title: meeting.title,
          platform: meeting.platform,
          meeting_link: meeting.meeting_link || null,
          organizerName,
        });
      }
    }
  }
}

export default new ScheduledMeetingService();
