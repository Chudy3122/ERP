import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { User } from './User.model';

@Entity('leave_year_balances')
@Unique('UQ_leave_year_balances_user_year', ['user_id', 'year'])
export class LeaveYearBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('integer')
  year: number;

  @Column('double precision')
  annual_leave_days: number;

  @Column('double precision')
  carried_over_days: number;

  @Column('double precision')
  used_leave_days: number;

  @Column('double precision')
  remote_work_days: number;

  @Column('double precision')
  used_remote_days: number;

  @Column('double precision')
  working_hours_per_day: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  employment_fraction: string | null;

  @Column({ type: 'integer', nullable: true })
  carryover_source_year: number | null;

  @Column({ type: 'double precision', default: 0 })
  carryover_adjustment: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
