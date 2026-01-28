import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';

export enum MeetingPlatform {
  INTERNAL = 'internal',
  TEAMS = 'teams',
  ZOOM = 'zoom',
  GOOGLE_MEET = 'google_meet',
}

@Entity('scheduled_meetings')
export class ScheduledMeeting extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: MeetingPlatform,
    default: MeetingPlatform.TEAMS,
  })
  platform: MeetingPlatform;

  @Column({ type: 'text', nullable: true })
  meeting_link: string;

  @Column({ type: 'date' })
  scheduled_date: Date;

  @Column({ type: 'time' })
  scheduled_time: string;

  @Column({ type: 'integer', default: 60 })
  duration_minutes: number;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'simple-array', nullable: true })
  participant_ids: string[];

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
