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
import { Invoice } from './Invoice.model';

@Entity('invoice_items')
export class InvoiceItem extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  invoice_id: string;

  @Column({ type: 'integer', default: 1 })
  position: number;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  quantity: number;

  @Column({ length: 20, default: 'szt.' })
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price_net: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 23.00 })
  vat_rate: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  vat_amount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  gross_amount: number;

  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
