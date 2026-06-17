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

/**
 * A mailbox a user connected to the built-in email client (IMAP + SMTP).
 * Multiple accounts per user are supported. The password is stored encrypted
 * (AES-256-GCM) — never in plain text.
 */
@Entity('email_accounts')
export class EmailAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  // Identity
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  display_name: string | null;

  // Login (often equal to email)
  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'text' })
  password_encrypted: string;

  // IMAP (incoming)
  @Column({ type: 'varchar', length: 255 })
  imap_host: string;

  @Column({ type: 'integer', default: 993 })
  imap_port: number;

  @Column({ type: 'boolean', default: true })
  imap_secure: boolean;

  // SMTP (outgoing)
  @Column({ type: 'varchar', length: 255 })
  smtp_host: string;

  @Column({ type: 'integer', default: 465 })
  smtp_port: number;

  @Column({ type: 'boolean', default: true })
  smtp_secure: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_checked_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
