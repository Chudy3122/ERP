import { In, Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { BossCalendar, BossCalendarEntryType } from '../models/BossCalendar.model';
import { User } from '../models/User.model';
import notificationService from './notification.service';

interface CreateEntryDto {
  date: string;
  end_date?: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  type?: BossCalendarEntryType;
  location?: string;
  participant_ids?: string[];
  created_by: string;
}

interface UpdateEntryDto {
  date?: string;
  end_date?: string | null;
  start_time?: string;
  end_time?: string;
  title?: string;
  description?: string;
  type?: BossCalendarEntryType;
  location?: string;
  participant_ids?: string[];
  updated_by: string;
}

export class BossCalendarService {
  private repo: Repository<BossCalendar>;

  constructor() {
    this.repo = AppDataSource.getRepository(BossCalendar);
  }

  async getByDateRange(from: string, to: string): Promise<BossCalendar[]> {
    // Overlap: entry starts on/before the range end AND ends (end_date or date)
    // on/after the range start — so multi-day entries show on every covered day.
    return this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.creator', 'creator')
      .where('e.date <= :to', { to })
      .andWhere('COALESCE(e.end_date, e.date) >= :from', { from })
      .orderBy('e.date', 'ASC')
      .addOrderBy('e.start_time', 'ASC')
      .getMany();
  }

  async getById(id: string): Promise<BossCalendar | null> {
    return this.repo.findOne({ where: { id }, relations: ['creator'] });
  }

  async create(dto: CreateEntryDto): Promise<BossCalendar> {
    // The creator is NOT auto-added — they can create a meeting for others they
    // don't attend. They only become a participant if they pick themselves.
    const participant_ids = Array.from(new Set(dto.participant_ids || []));
    const entry = this.repo.create({ ...dto, participant_ids });
    return this.repo.save(entry);
  }

  async update(id: string, dto: UpdateEntryDto): Promise<BossCalendar | null> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return null;
    Object.assign(entry, dto);
    if (dto.participant_ids) {
      entry.participant_ids = Array.from(new Set(dto.participant_ids));
    }
    return this.repo.save(entry);
  }

  async setCompleted(id: string, completed: boolean): Promise<BossCalendar | null> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return null;
    entry.completed = completed;
    entry.completed_at = completed ? new Date() : null;
    return this.repo.save(entry);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Notify meeting participants on create ('new') or change ('update').
   * The person performing the action is never notified about their own action.
   */
  async notifyParticipants(entry: BossCalendar, actorId: string, kind: 'new' | 'update'): Promise<void> {
    const ids = (Array.isArray(entry.participant_ids) ? entry.participant_ids : []).filter(
      (id) => id && id !== actorId,
    );
    if (ids.length === 0) return;

    const userRepo = AppDataSource.getRepository(User);
    const recipients = await userRepo.find({ where: { id: In(ids), is_active: true } });
    if (recipients.length === 0) return;

    const actor = await userRepo.findOne({ where: { id: actorId } });
    const actorName = actor ? `${actor.first_name} ${actor.last_name}` : 'Ktoś';
    const dateLabel =
      entry.end_date && entry.end_date !== entry.date ? `${entry.date} – ${entry.end_date}` : entry.date;
    const timeLabel = `${entry.start_time}–${entry.end_time}`;

    for (const r of recipients) {
      await notificationService.notifyBossCalendarParticipant(
        r.id,
        kind,
        entry.title,
        dateLabel,
        timeLabel,
        entry.id,
        actorName,
        actorId,
      );
    }
  }
}
