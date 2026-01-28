import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';
import { Task } from './Task.model';
import { Project } from './Project.model';

export enum WorkLogType {
  REGULAR = 'regular',           // Płatny (domyślny)
  UNPAID = 'unpaid',             // Niepłatny
  OVERTIME = 'overtime',         // Nadgodziny
  OVERTIME_COMP = 'overtime_comp', // Odbiór nadgodzin
  BUSINESS_TRIP = 'business_trip', // Wyjście służbowe
  LATE = 'late',                 // Spóźnienie
}

@Entity('work_logs')
export class WorkLog extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  task_id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string;

  @Column({ type: 'date' })
  work_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  hours: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  is_billable: boolean;

  @Column({
    type: 'enum',
    enum: WorkLogType,
    default: WorkLogType.REGULAR,
  })
  work_type: WorkLogType;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Task, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
