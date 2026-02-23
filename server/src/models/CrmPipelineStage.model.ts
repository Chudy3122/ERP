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
import { CrmPipeline } from './CrmPipeline.model';
import { CrmDeal } from './CrmDeal.model';

@Entity('crm_pipeline_stages')
export class CrmPipelineStage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  pipeline_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'int', default: 0 })
  win_probability: number;

  @Column({ type: 'boolean', default: false })
  is_won_stage: boolean;

  @Column({ type: 'boolean', default: false })
  is_lost_stage: boolean;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CrmPipeline, (pipeline) => pipeline.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: CrmPipeline;

  @OneToMany(() => CrmDeal, (deal) => deal.stage)
  deals: CrmDeal[];
}
