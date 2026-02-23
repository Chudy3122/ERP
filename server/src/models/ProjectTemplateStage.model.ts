import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { ProjectTemplate } from './ProjectTemplate.model';

@Entity('project_template_stages')
export class ProjectTemplateStage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'boolean', default: false })
  is_completed_stage: boolean;

  // Relations
  @ManyToOne(() => ProjectTemplate, (template) => template.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ProjectTemplate;
}
