import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User.model';

/**
 * A remote-support target: an employee's computer reachable via RustDesk.
 * IT registers the RustDesk id (and optional unattended password) so the ERP
 * can launch a session with one click. Passwords are visible to IT/admins only.
 */
@Entity('remote_devices')
export class RemoteDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The employee who uses this computer. */
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 120, default: 'Komputer' })
  label: string;

  @Column({ type: 'varchar', length: 64 })
  rustdesk_id: string;

  /** Unattended-access password (optional). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  access_password: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
