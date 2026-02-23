import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';
import { CrmDeal } from './CrmDeal.model';

export enum DealActivityType {
  NOTE = 'note',
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  TASK = 'task',
  STAGE_CHANGE = 'stage_change',
  STATUS_CHANGE = 'status_change',
}

@Entity('crm_deal_activities')
export class CrmDealActivity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  deal_id: string;

  @Column({ type: 'enum', enum: DealActivityType })
  type: DealActivityType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduled_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date;

  @Column({ type: 'boolean', default: false })
  is_completed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'uuid' })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => CrmDeal, (deal) => deal.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: CrmDeal;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
