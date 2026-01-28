import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { Project } from './Project.model';
import { User } from './User.model';

@Entity('project_attachments')
export class ProjectAttachment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  project_id: string;

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

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  // Helper to get file extension
  getFileExtension(): string {
    return this.original_name.split('.').pop()?.toLowerCase() || '';
  }

  // Helper to check if file is an image
  isImage(): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(this.getFileExtension());
  }

  // Helper to format file size
  getFormattedSize(): string {
    const bytes = Number(this.file_size);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
