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

export enum ProcedureStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum ProcedureCategory {
  IT = 'IT',
  HR = 'HR',
  FINANCE = 'Finanse',
  OPERATIONS = 'Operacje',
  SAFETY = 'BHP',
  QUALITY = 'Jakość',
  SALES = 'Sprzedaż',
  OTHER = 'Inne',
}

@Entity('procedures')
export class Procedure extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({
    type: 'enum',
    enum: ProcedureStatus,
    default: ProcedureStatus.DRAFT,
  })
  status: ProcedureStatus;

  @Column({ length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updater: User;
}
