import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.model';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Sound notifications
  @Column({ type: 'boolean', default: true })
  sound_enabled: boolean;

  @Column({ type: 'varchar', length: 50, default: 'default' })
  sound_type: string; // 'default', 'chime', 'bell', 'pop', 'none'

  @Column({ type: 'integer', default: 50 })
  sound_volume: number; // 0-100

  // Visual notifications
  @Column({ type: 'boolean', default: true })
  desktop_notifications: boolean;

  @Column({ type: 'boolean', default: true })
  show_preview: boolean; // Show message preview in notification

  @Column({ type: 'boolean', default: true })
  badge_count: boolean; // Show unread count badge

  // Specific notification types
  @Column({ type: 'boolean', default: true })
  notify_messages: boolean;

  @Column({ type: 'boolean', default: true })
  notify_mentions: boolean;

  @Column({ type: 'boolean', default: true })
  notify_leave_status: boolean;

  @Column({ type: 'boolean', default: true })
  notify_time_reminders: boolean;

  @Column({ type: 'boolean', default: false })
  notify_system_updates: boolean;

  // Do Not Disturb
  @Column({ type: 'boolean', default: false })
  dnd_enabled: boolean;

  @Column({ type: 'time', nullable: true })
  dnd_start_time: string | null; // e.g., "22:00:00"

  @Column({ type: 'time', nullable: true })
  dnd_end_time: string | null; // e.g., "08:00:00"

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
