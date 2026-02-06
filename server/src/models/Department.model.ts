import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User.model';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  head_id: string | null;

  @Column({ type: 'integer', default: 0 })
  order_index: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color: string | null;

  @ManyToOne(() => Department, (dept) => dept.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Department | null;

  @OneToMany(() => Department, (dept) => dept.parent)
  children: Department[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'head_id' })
  head: User | null;

  @OneToMany(() => User, (user) => user.departmentEntity)
  employees: User[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // Get full hierarchy path
  get path(): string[] {
    const path: string[] = [this.name];
    let current: Department | null = this.parent;
    while (current) {
      path.unshift(current.name);
      current = current.parent;
    }
    return path;
  }
}
