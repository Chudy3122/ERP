import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { Ticket } from './Ticket.model';
import { User } from './User.model';

@Entity('ticket_attachments')
export class TicketAttachment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticket_id: string;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ type: 'varchar', length: 255 })
  file_name: string;

  @Column({ type: 'varchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 100 })
  file_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'text' })
  file_url: string;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  isImage(): boolean {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return imageTypes.includes(this.file_type);
  }

  getFormattedSize(): string {
    const bytes = Number(this.file_size);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}
