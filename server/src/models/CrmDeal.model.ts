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
import { Client } from './Client.model';
import { Invoice } from './Invoice.model';
import { CrmPipeline } from './CrmPipeline.model';
import { CrmPipelineStage } from './CrmPipelineStage.model';
import { CrmDealActivity } from './CrmDealActivity.model';

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('crm_deals')
export class CrmDeal extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  pipeline_id: string;

  @Column({ type: 'uuid' })
  stage_id: string;

  @Column({ type: 'uuid', nullable: true })
  client_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_person: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contact_email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contact_phone: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'varchar', length: 3, default: 'PLN' })
  currency: string;

  @Column({ type: 'enum', enum: DealStatus, default: DealStatus.OPEN })
  status: DealStatus;

  @Column({ type: 'enum', enum: DealPriority, default: DealPriority.MEDIUM })
  priority: DealPriority;

  @Column({ type: 'date', nullable: true })
  expected_close_date: Date;

  @Column({ type: 'date', nullable: true })
  actual_close_date: Date;

  @Column({ type: 'uuid', nullable: true })
  assigned_to: string;

  @Column({ type: 'text', nullable: true })
  lost_reason: string;

  @Column({ type: 'uuid', nullable: true })
  won_invoice_id: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CrmPipeline, (pipeline) => pipeline.deals)
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: CrmPipeline;

  @ManyToOne(() => CrmPipelineStage, (stage) => stage.deals)
  @JoinColumn({ name: 'stage_id' })
  stage: CrmPipelineStage;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: User;

  @ManyToOne(() => Invoice, { nullable: true })
  @JoinColumn({ name: 'won_invoice_id' })
  won_invoice: Invoice;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => CrmDealActivity, (activity) => activity.deal)
  activities: CrmDealActivity[];
}
