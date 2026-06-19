import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './Vehicle.model';
import { User } from './User.model';

/**
 * A service/expense log entry for a vehicle — the "dzienniczek napraw i wydatków"
 * (e.g. clutch replacement, date, cost).
 */
@Entity('vehicle_log_entries')
export class VehicleLogEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vehicle_id: string;

  @Column({ type: 'date' })
  entry_date: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  // 'repair' | 'service' | 'expense' | 'other'
  @Column({ type: 'varchar', length: 20, default: 'repair' })
  category: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cost: number | null;

  @Column({ type: 'integer', nullable: true })
  mileage: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User | null;
}
