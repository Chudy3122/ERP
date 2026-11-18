import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './User.model';

@Entity('leave_year_openings')
export class LeaveYearOpening {
  @PrimaryColumn('integer')
  year: number;

  @Column({ type: 'varchar', length: 64 })
  approved_fingerprint: string;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string | null;

  @Column('timestamptz')
  approved_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  opened_at: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: User | null;
}
