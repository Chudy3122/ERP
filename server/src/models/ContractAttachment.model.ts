import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';
import { User } from './User.model';
import { Contract } from './Contract.model';

@Entity('contract_attachments')
export class ContractAttachment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contract_id: string;

  @Column({ length: 255 })
  file_name: string;

  @Column({ length: 255 })
  original_name: string;

  @Column({ length: 100 })
  file_type: string;

  @Column({ type: 'bigint' })
  file_size: number;

  @Column({ type: 'text' })
  file_url: string;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => Contract, (contract) => contract.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;
}
