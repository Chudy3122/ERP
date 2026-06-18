import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.model';

export type CalendarRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

/**
 * A personal calendar event in the "Strefa prywatna". One-off or recurring.
 * Reminders are delivered in-app (bell). `next_remind_at` is maintained by the
 * server so the background job knows when to fire the next reminder.
 */
@Entity('personal_calendar_events')
export class PersonalCalendarEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'timestamp' })
  event_date: Date;

  @Column({ type: 'boolean', default: false })
  all_day: boolean;

  // null = no reminder; otherwise minutes before the event (0, 10, 60, 1440, …)
  @Column({ type: 'integer', nullable: true })
  remind_minutes_before: number | null;

  @Column({ type: 'varchar', length: 20, default: 'none' })
  recurrence: CalendarRecurrence;

  // Optional end of the recurrence; null = forever.
  @Column({ type: 'timestamp', nullable: true })
  recurrence_until: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  // Internal: when the next reminder should fire (maintained server-side).
  @Column({ type: 'timestamp', nullable: true })
  next_remind_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
