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

export enum SupplyRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SupplyCategory {
  OFFICE = 'office',       // Artykuły biurowe
  EQUIPMENT = 'equipment', // Sprzęt
  OTHER = 'other',         // Inne
}

export enum SupplyPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

@Entity('supply_requests')
export class SupplyRequest extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ length: 255 })
  item_name: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: SupplyCategory.OFFICE })
  category: SupplyCategory;

  @Column({ type: 'varchar', length: 20, default: SupplyPriority.MEDIUM })
  priority: SupplyPriority;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: SupplyRequestStatus.PENDING })
  status: SupplyRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  review_notes: string | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
