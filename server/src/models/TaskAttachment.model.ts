import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { Task } from './Task.model';
import { User } from './User.model';

@Entity('task_attachments')
export class TaskAttachment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  task_id: string;

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
  uploaded_by: string;

  @ManyToOne(() => Task, task => task.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @CreateDateColumn()
  created_at: Date;

  // Helper to get human readable file size
  getReadableSize(): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (this.file_size === 0) return '0 B';
    const i = Math.floor(Math.log(Number(this.file_size)) / Math.log(1024));
    return `${(Number(this.file_size) / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }

  // Check if file is an image
  isImage(): boolean {
    return this.file_type.startsWith('image/');
  }
}
