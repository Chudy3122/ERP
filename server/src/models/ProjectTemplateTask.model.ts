import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { ProjectTemplate } from './ProjectTemplate.model';

export enum TemplateTaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('project_template_tasks')
export class ProjectTemplateTask extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'int', default: 0 })
  stage_position: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TemplateTaskPriority,
    default: TemplateTaskPriority.MEDIUM,
  })
  priority: TemplateTaskPriority;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  estimated_hours: number;

  @Column({ type: 'int', default: 0 })
  order_index: number;

  // Relations
  @ManyToOne(() => ProjectTemplate, (template) => template.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ProjectTemplate;
}
