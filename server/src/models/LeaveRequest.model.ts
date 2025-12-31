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

export enum LeaveType {
  VACATION = 'vacation',
  SICK_LEAVE = 'sick_leave',
  PERSONAL = 'personal',
  UNPAID = 'unpaid',
  PARENTAL = 'parental',
  OTHER = 'other',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: LeaveType,
  })
  leave_type: LeaveType;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'integer' })
  total_days: number; // Calculated based on start/end dates

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  // Helper methods
  calculateTotalDays(): number {
    const start = new Date(this.start_date);
    const end = new Date(this.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end dates
  }

  approve(reviewerId: string, notes?: string): void {
    this.status = LeaveStatus.APPROVED;
    this.reviewed_by = reviewerId;
    this.reviewed_at = new Date();
    this.review_notes = notes || null;
  }

  reject(reviewerId: string, notes?: string): void {
    this.status = LeaveStatus.REJECTED;
    this.reviewed_by = reviewerId;
    this.reviewed_at = new Date();
    this.review_notes = notes || null;
  }

  cancel(): void {
    if (this.status === LeaveStatus.PENDING || this.status === LeaveStatus.APPROVED) {
      this.status = LeaveStatus.CANCELLED;
    } else {
      throw new Error('Cannot cancel leave request with current status');
    }
  }

  isOverlapping(otherRequest: LeaveRequest): boolean {
    const thisStart = new Date(this.start_date).getTime();
    const thisEnd = new Date(this.end_date).getTime();
    const otherStart = new Date(otherRequest.start_date).getTime();
    const otherEnd = new Date(otherRequest.end_date).getTime();

    return thisStart <= otherEnd && otherStart <= thisEnd;
  }
}
