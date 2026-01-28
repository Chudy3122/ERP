import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';
import { Project } from './Project.model';
import { TicketAttachment } from './TicketAttachment.model';

export enum TicketType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  SUPPORT = 'support',
  QUESTION = 'question',
  OTHER = 'other',
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_RESPONSE = 'waiting_response',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tickets')
export class Ticket extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20, unique: true })
  ticket_number: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TicketType,
    default: TicketType.SUPPORT,
  })
  type: TicketType;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.NORMAL,
  })
  priority: TicketPriority;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany(() => TicketAttachment, attachment => attachment.ticket, { eager: true })
  attachments: TicketAttachment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
