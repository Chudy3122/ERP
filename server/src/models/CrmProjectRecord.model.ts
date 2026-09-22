import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CrmProjectParticipant } from './CrmProjectParticipant.model';

/**
 * A free-form project record for the reworked CRM ("Dane projektowe"): a
 * project name plus general info, with a list of participants attached.
 * Not linked to the Projects module — the name is plain text.
 */
@Entity('crm_project_records')
export class CrmProjectRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  info: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @OneToMany(() => CrmProjectParticipant, (p) => p.project, { cascade: true })
  participants: CrmProjectParticipant[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
