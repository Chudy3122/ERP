import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { BossCalendar, BossCalendarEntryType } from '../models/BossCalendar.model';
import { User, UserRole } from '../models/User.model';
import notificationService from './notification.service';
import { sendEmail } from '../utils/email';

interface CreateEntryDto {
  date: string;
  end_date?: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  type?: BossCalendarEntryType;
  location?: string;
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
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async update(id: string, dto: UpdateEntryDto): Promise<BossCalendar | null> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) return null;
    Object.assign(entry, dto);
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
   * Notify the boss(es) about a newly added calendar entry.
   * The creator (if they are a boss) is not notified about their own entry.
   */
  async notifyNewEntry(entry: BossCalendar, creatorId: string): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const bosses = await userRepo.find({ where: { role: UserRole.SZEF, is_active: true } });
    if (bosses.length === 0) return;

    const creator = await userRepo.findOne({ where: { id: creatorId } });
    const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Ktoś';
    const dateLabel =
      entry.end_date && entry.end_date !== entry.date ? `${entry.date} – ${entry.end_date}` : entry.date;
    const timeLabel = `${entry.start_time}–${entry.end_time}`;

    for (const boss of bosses) {
      if (boss.id === creatorId) continue;
      await notificationService.notifyBossCalendarEntry(
        boss.id,
        entry.title,
        dateLabel,
        timeLabel,
        entry.id,
        creatorName,
        creatorId,
      );

      // Also e-mail the boss (no-op if SMTP isn't configured; never breaks creation)
      if (boss.email) {
        const lines = [
          `${creatorName} dodał nowy wpis w kalendarzu szefa:`,
          ``,
          `• Tytuł: ${entry.title}`,
          `• Termin: ${dateLabel}, ${timeLabel}`,
          entry.location ? `• Miejsce: ${entry.location}` : '',
          entry.description ? `\n${entry.description}` : '',
        ].filter(Boolean);
        sendEmail({
          to: boss.email,
          subject: `Nowy wpis w kalendarzu: ${entry.title}`,
          text: lines.join('\n'),
          html: `<p>${creatorName} dodał nowy wpis w kalendarzu szefa:</p>
<ul>
  <li><strong>Tytuł:</strong> ${entry.title}</li>
  <li><strong>Termin:</strong> ${dateLabel}, ${timeLabel}</li>
  ${entry.location ? `<li><strong>Miejsce:</strong> ${entry.location}</li>` : ''}
</ul>
${entry.description ? `<p>${entry.description}</p>` : ''}`,
        }).catch((err) => console.error('[email] boss calendar notify failed:', err?.message || err));
      }
    }
  }
}
