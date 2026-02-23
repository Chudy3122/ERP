import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './User.model';

export enum NotificationType {
  CHAT_MESSAGE = 'chat_message',
  CHAT_MENTION = 'chat_mention',
  CHANNEL_INVITE = 'channel_invite',
  TIME_ENTRY_APPROVED = 'time_entry_approved',
  TIME_ENTRY_REJECTED = 'time_entry_rejected',
  LEAVE_REQUEST_APPROVED = 'leave_request_approved',
  LEAVE_REQUEST_REJECTED = 'leave_request_rejected',
  LEAVE_REQUEST_PENDING = 'leave_request_pending',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  USER_STATUS_CHANGED = 'user_status_changed',
  // Invoice & Payment notifications
  INVOICE_OVERDUE = 'invoice_overdue',
  PAYMENT_RECEIVED = 'payment_received',
  // Contract notifications
  CONTRACT_EXPIRING = 'contract_expiring',
  CONTRACT_EXPIRED = 'contract_expired',
  // CRM notifications
  DEAL_ASSIGNED = 'deal_assigned',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  DEAL_WON = 'deal_won',
  DEAL_FOLLOW_UP = 'deal_follow_up',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  action_url: string | null;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  read_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  related_user_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  related_entity_type: string | null;

  @Column({ type: 'uuid', nullable: true })
  related_entity_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'related_user_id' })
  related_user: User | null;
}
