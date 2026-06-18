import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  registration: string | null;

  @Column({ type: 'integer', nullable: true })
  year: number | null;

  @Column({ type: 'integer', nullable: true })
  seats: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  fuel_type: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
