import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Department } from './Department.model';

export enum UserRole {
  ADMIN = 'admin',
  KIEROWNIK = 'kierownik',
  EMPLOYEE = 'employee',
  KSIEGOWOSC = 'ksiegowosc', // Księgowość — finanse + ograniczony zakres
  KADRY = 'kadry',           // Kadry — pełny dostęp HR (dawna „księgowość")
  SZEF = 'szef',
  SEKRETARIAT = 'sekretariat',
}

@Entity('users')
export class User {
  // bcrypt cost factor — 10 is the secure default and ~3-4x faster than 12
  // on low-power hosts (Render free tier), which speeds up login noticeably.
  static readonly SALT_ROUNDS = 10;

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

  @Column({ type: 'uuid', nullable: true })
  department_id: string | null;

  @ManyToOne(() => Department, (dept) => dept.employees, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  departmentEntity: Department | null;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'text', nullable: true })
  cover_url: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // When true, this account cannot log in from a mobile/tablet — desktop only. (legacy)
  @Column({ type: 'boolean', default: false })
  desktop_only: boolean;

  // Phone/tablet login is blocked for everyone EXCEPT accounts with this flag.
  @Column({ type: 'boolean', default: false })
  mobile_allowed: boolean;

  // When true, time-tracking always records this account's device as "desktop".
  @Column({ type: 'boolean', default: false })
  force_desktop_device: boolean;

  // When set, an active work session is auto-closed after this many minutes.
  @Column({ type: 'integer', nullable: true })
  auto_close_after_minutes: number | null;

  // Can manage the car fleet (assign/reject vehicle requests). Admins always can.
  @Column({ type: 'boolean', default: false })
  is_fleet_manager: boolean;

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

  @ManyToOne(() => User, (user) => user.directReports, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @OneToMany(() => User, (user) => user.manager)
  directReports: User[];

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 8.0 })
  working_hours_per_day: number;

  // Leave allowances are kept in DAYS (fractional allowed so part-time hour-based
  // leave can be converted to days). Hours shown in UI = days × working_hours_per_day.
  @Column({ type: 'double precision', default: 20 })
  annual_leave_days: number;

  // Leftover (zaległy) leave days carried over from the previous year
  @Column({ type: 'double precision', default: 0 })
  carried_over_days: number;

  // Yearly remote-work (praca zdalna) entitlement — official default 24 days
  @Column({ type: 'double precision', default: 24 })
  remote_work_days: number;

  // Manual "used" baselines migrated from the previous system. Total used =
  // baseline + approved requests created in this system afterwards.
  @Column({ type: 'double precision', default: 0 })
  used_leave_days: number;

  @Column({ type: 'double precision', default: 0 })
  used_remote_days: number;

  // Employment fraction (etat), e.g. "1", "7/8", "1/2"
  @Column({ type: 'varchar', length: 10, nullable: true })
  employment_fraction: string | null;

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
      this.password_hash = await bcrypt.hash(this.password, User.SALT_ROUNDS);
      delete this.password;
    }
  }

  // Hash password before update (if changed)
  @BeforeUpdate()
  async hashPasswordBeforeUpdate() {
    if (this.password) {
      this.password_hash = await bcrypt.hash(this.password, User.SALT_ROUNDS);
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
