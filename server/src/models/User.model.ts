import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  ADMIN = 'admin',
  TEAM_LEADER = 'team_leader',
  EMPLOYEE = 'employee',
  KSIEGOWOSC = 'ksiegowosc',
  SZEF = 'szef',
  RECEPCJA = 'recepcja',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_login: Date | null;

  // Employee fields
  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  employee_id: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string | null;

  @Column({ type: 'date', nullable: true })
  hire_date: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  contract_type: string | null;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  working_hours_per_day: number;

  @Column({ type: 'integer', default: 20 })
  annual_leave_days: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Virtual field for password (not stored in DB)
  password?: string;

  // Hash password before insert
  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.password) {
      this.password_hash = await bcrypt.hash(this.password, 12);
      delete this.password;
    }
  }

  // Hash password before update (if changed)
  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    if (this.password) {
      this.password_hash = await bcrypt.hash(this.password, 12);
      delete this.password;
    }
  }

  // Method to verify password
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password_hash);
  }

  // Get full name
  get fullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  // Method to convert user to safe object (without sensitive data)
  toJSON() {
    const { password_hash, password, ...user } = this;
    return user;
  }
}
