import { LessThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PersonalCalendarEvent, CalendarRecurrence } from '../models/PersonalCalendarEvent.model';
import notificationService from './notification.service';

interface EventDto {
  title: string;
  description?: string | null;
  event_date: string; // ISO
  all_day?: boolean;
  remind_minutes_before?: number | null;
  recurrence?: CalendarRecurrence;
  recurrence_until?: string | null;
  color?: string | null;
}

const RECURRENCES: CalendarRecurrence[] = ['none', 'daily', 'weekly', 'monthly'];

function addRecurrence(date: Date, recurrence: CalendarRecurrence): Date {
  const d = new Date(date);
  if (recurrence === 'daily') d.setDate(d.getDate() + 1);
  else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

/** Earliest reminder time strictly after `after`, or null if none/disabled. */
function computeNextRemindAt(ev: PersonalCalendarEvent, after: Date): Date | null {
  if (ev.remind_minutes_before == null) return null;
  const lead = ev.remind_minutes_before * 60000;
  const until = ev.recurrence_until ? new Date(ev.recurrence_until) : null;
  let occ = new Date(ev.event_date);
  for (let i = 0; i < 3000; i++) {
    if (until && occ.getTime() > until.getTime()) return null;
    const remindAt = new Date(occ.getTime() - lead);
    if (remindAt.getTime() > after.getTime()) return remindAt;
    if (ev.recurrence === 'none') return null;
    occ = addRecurrence(occ, ev.recurrence);
  }
  return null;
}

/** Concrete occurrence dates of an event within [from, to]. */
function expandOccurrences(ev: PersonalCalendarEvent, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const until = ev.recurrence_until ? new Date(ev.recurrence_until) : null;
  let occ = new Date(ev.event_date);
  for (let i = 0; i < 3000; i++) {
    if (occ.getTime() > to.getTime()) break;
    if (until && occ.getTime() > until.getTime()) break;
    if (occ.getTime() >= from.getTime()) out.push(new Date(occ));
    if (ev.recurrence === 'none') break;
    occ = addRecurrence(occ, ev.recurrence);
  }
  return out;
}

function formatWhen(date: Date, allDay: boolean): string {
  const opts: Intl.DateTimeFormatOptions = allDay
    ? { timeZone: 'Europe/Warsaw', weekday: 'long', day: 'numeric', month: 'long' }
    : { timeZone: 'Europe/Warsaw', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleString('pl-PL', opts);
}

export class PersonalCalendarService {
  private repo = AppDataSource.getRepository(PersonalCalendarEvent);

  private normalize(dto: EventDto): Partial<PersonalCalendarEvent> {
    if (!dto.title?.trim()) throw new Error('Tytuł jest wymagany');
    if (!dto.event_date) throw new Error('Data wydarzenia jest wymagana');
    const recurrence: CalendarRecurrence = RECURRENCES.includes(dto.recurrence as CalendarRecurrence)
      ? (dto.recurrence as CalendarRecurrence)
      : 'none';
    return {
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      event_date: new Date(dto.event_date),
      all_day: !!dto.all_day,
      remind_minutes_before: dto.remind_minutes_before == null ? null : Number(dto.remind_minutes_before),
      recurrence,
      recurrence_until: dto.recurrence_until ? new Date(dto.recurrence_until) : null,
      color: dto.color?.trim() || null,
    };
  }

  /** List occurrences for the user within [from, to] (expanded for recurring). */
  async list(userId: string, from: Date, to: Date) {
    const events = await this.repo.find({
      where: { user_id: userId, event_date: LessThanOrEqual(to) },
      order: { event_date: 'ASC' },
    });
    const occurrences: any[] = [];
    for (const ev of events) {
      for (const occ of expandOccurrences(ev, from, to)) {
        occurrences.push({
          id: ev.id,
          occurrence_date: occ.toISOString(),
          title: ev.title,
          description: ev.description,
          all_day: ev.all_day,
          remind_minutes_before: ev.remind_minutes_before,
          recurrence: ev.recurrence,
          recurrence_until: ev.recurrence_until,
          color: ev.color,
          is_recurring: ev.recurrence !== 'none',
        });
      }
    }
    occurrences.sort((a, b) => new Date(a.occurrence_date).getTime() - new Date(b.occurrence_date).getTime());
    return occurrences;
  }

  async create(userId: string, dto: EventDto): Promise<PersonalCalendarEvent> {
    const data = this.normalize(dto);
    const event = this.repo.create({ ...data, user_id: userId } as PersonalCalendarEvent);
    event.next_remind_at = computeNextRemindAt(event, new Date());
    return this.repo.save(event);
  }

  async update(id: string, userId: string, dto: EventDto): Promise<PersonalCalendarEvent> {
    const event = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!event) throw new Error('Wydarzenie nie znalezione');
    Object.assign(event, this.normalize(dto));
    event.next_remind_at = computeNextRemindAt(event, new Date());
    return this.repo.save(event);
  }

  async delete(id: string, userId: string): Promise<void> {
    const event = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!event) throw new Error('Wydarzenie nie znalezione');
    await this.repo.remove(event);
  }

  /** Background job: fire due reminders and advance to the next occurrence. */
  async processDueReminders(): Promise<void> {
    const now = new Date();
    const due = await this.repo.find({ where: { next_remind_at: LessThanOrEqual(now) } });
    for (const ev of due) {
      try {
        const lead = (ev.remind_minutes_before ?? 0) * 60000;
        const occ = new Date(ev.next_remind_at!.getTime() + lead);
        await notificationService.notifyCalendarReminder(ev.user_id, ev.title, formatWhen(occ, ev.all_day), ev.id);
      } catch (e) {
        console.error('Calendar reminder error:', e);
      }
      ev.next_remind_at = computeNextRemindAt(ev, now);
      await this.repo.save(ev);
    }
  }
}

export default new PersonalCalendarService();
