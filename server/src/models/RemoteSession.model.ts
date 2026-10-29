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
import { RemoteDevice } from './RemoteDevice.model';

export enum RemoteSessionStatus {
  REQUESTED = 'requested',   // employee asked for help
  IN_PROGRESS = 'in_progress', // IT accepted / connected
  CLOSED = 'closed',         // finished
  CANCELLED = 'cancelled',   // request withdrawn
}

/** A remote-help session: a request from an employee and/or a logged IT session. */
@Entity('remote_sessions')
export class RemoteSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Employee who needs help (null if IT started the session directly). */
  @Column({ type: 'uuid', nullable: true })
  requester_id: string | null;

  /** IT person who handled it. */
  @Column({ type: 'uuid', nullable: true })
  helper_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  device_id: string | null;

  /** Optional link to a ticket. */
  @Column({ type: 'uuid', nullable: true })
  ticket_id: string | null;

  @Column({ type: 'varchar', length: 20, default: RemoteSessionStatus.REQUESTED })
  status: RemoteSessionStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  ended_at: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'requester_id' })
  requester: User | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'helper_id' })
  helper: User | null;

  @ManyToOne(() => RemoteDevice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id' })
  device: RemoteDevice | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
