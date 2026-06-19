import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vehicle } from './Vehicle.model';

/**
 * A dated obligation for a vehicle (przegląd, ubezpieczenie, …) with a reminder
 * fired before the due date to fleet managers.
 */
@Entity('vehicle_reminders')
export class VehicleReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  vehicle_id: string;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'integer', default: 14 })
  remind_days_before: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // When the reminder was fired (null = not yet). Reset on date change.
  @Column({ type: 'timestamp', nullable: true })
  reminded_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;
}
