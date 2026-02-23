import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';
import { ProjectTemplateStage } from './ProjectTemplateStage.model';
import { ProjectTemplateTask } from './ProjectTemplateTask.model';

@Entity('project_templates')
export class ProjectTemplate extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ProjectTemplateStage, (stage) => stage.template, { eager: true, cascade: true })
  stages: ProjectTemplateStage[];

  @OneToMany(() => ProjectTemplateTask, (task) => task.template, { eager: true, cascade: true })
  tasks: ProjectTemplateTask[];
}
