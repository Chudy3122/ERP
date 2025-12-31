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

export enum StatusType {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
  IN_MEETING = 'in_meeting',
}

@Entity('user_statuses')
export class UserStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @Column({
    type: 'enum',
    enum: StatusType,
    default: StatusType.OFFLINE,
  })
  status: StatusType;

  @Column({ type: 'text', nullable: true })
  custom_message: string | null;

  @Column({ type: 'timestamp', nullable: true })
  last_seen: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
