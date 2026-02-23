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
import { CrmPipelineStage } from './CrmPipelineStage.model';
import { CrmDeal } from './CrmDeal.model';

@Entity('crm_pipelines')
export class CrmPipeline extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 7, default: '#3B82F6' })
  color: string;

  @Column({ type: 'int', default: 0 })
  position: number;

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

  @OneToMany(() => CrmPipelineStage, (stage) => stage.pipeline, { eager: true, cascade: true })
  stages: CrmPipelineStage[];

  @OneToMany(() => CrmDeal, (deal) => deal.pipeline)
  deals: CrmDeal[];
}
