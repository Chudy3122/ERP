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
  VACATION = 'vacation',          // Urlop wypoczynkowy — odlicza dni
  PERSONAL = 'personal',          // Urlop na żądanie — odlicza dni
  SICK_LEAVE = 'sick_leave',      // Zwolnienie lekarskie
  UNPAID = 'unpaid',              // Urlop bezpłatny
  PARENTAL = 'parental',          // Urlop rodzicielski
  MATERNITY = 'maternity',        // Urlop macierzyński
  PATERNITY = 'paternity',        // Urlop ojcowski
  CHILDCARE_188 = 'childcare_188',// Opieka nad dzieckiem do 14 lat (art. 188)
  CARE = 'care',                  // Urlop opiekuńczy (art. 173¹)
  OCCASIONAL = 'occasional',      // Urlop okolicznościowy
  REMOTE_WORK = 'remote_work',    // Praca zdalna (art. 67³³)
  OTHER = 'other',                // Inne
}

// Tylko te typy odliczają dni z rocznej puli urlopowej
export const DEDUCTING_LEAVE_TYPES: LeaveType[] = [LeaveType.VACATION, LeaveType.PERSONAL];

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
    // Count working days only (Mon–Fri); weekends don't deduct from leave.
    const s = new Date(this.start_date);
    const e = new Date(this.end_date);
    const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
    const last = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate()));
    let count = 0;
    while (cur.getTime() <= last.getTime()) {
      const dow = cur.getUTCDay();
      if (dow !== 0 && dow !== 6) count++; // skip Sunday (0) and Saturday (6)
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return count;
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
