import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CrmProjectRecord } from './CrmProjectRecord.model';

/** A single participant on a CRM project record (person + their details). */
@Entity('crm_project_participants')
export class CrmProjectParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_record_id: string;

  @Column({ type: 'varchar', length: 255 })
  full_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  role: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  // ── Key EFS participant fields ──
  @Column({ type: 'varchar', length: 64, nullable: true })
  pesel: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  gender: string | null;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  education: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  labour_status: string | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  /** Leftover EFS columns from a CSV import, as a readable "Header: value" list. */
  @Column({ type: 'text', nullable: true })
  extra_data: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => CrmProjectRecord, (r) => r.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_record_id' })
  project: CrmProjectRecord;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
