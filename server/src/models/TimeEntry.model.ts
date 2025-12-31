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

export enum TimeEntryStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('time_entries')
export class TimeEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'timestamp' })
  clock_in: Date;

  @Column({ type: 'timestamp', nullable: true })
  clock_out: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration_minutes: number | null; // Calculated on clock_out

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'boolean', default: false })
  is_overtime: boolean;

  @Column({ type: 'integer', default: 0 })
  overtime_minutes: number;

  @Column({
    type: 'enum',
    enum: TimeEntryStatus,
    default: TimeEntryStatus.IN_PROGRESS,
  })
  status: TimeEntryStatus;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: User | null;

  // Helper methods
  calculateDuration(): number {
    if (!this.clock_out) return 0;

    const diff = this.clock_out.getTime() - this.clock_in.getTime();
    return Math.floor(diff / (1000 * 60)); // Minutes
  }

  calculateOvertime(standardWorkMinutes: number = 480): number {
    // 480 min = 8 hours
    const duration = this.calculateDuration();
    const overtime = duration - standardWorkMinutes;
    return overtime > 0 ? overtime : 0;
  }

  clockOut(notes?: string): void {
    this.clock_out = new Date();
    this.notes = notes || this.notes;
    this.duration_minutes = this.calculateDuration();
    this.overtime_minutes = this.calculateOvertime();
    this.is_overtime = this.overtime_minutes > 0;
    this.status = TimeEntryStatus.COMPLETED;
  }

  approve(approverId: string): void {
    this.status = TimeEntryStatus.APPROVED;
    this.approved_by = approverId;
    this.approved_at = new Date();
  }

  reject(approverId: string): void {
    this.status = TimeEntryStatus.REJECTED;
    this.approved_by = approverId;
    this.approved_at = new Date();
  }
}
