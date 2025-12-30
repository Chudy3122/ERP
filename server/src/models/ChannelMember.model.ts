import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Channel } from './Channel.model';
import { User } from './User.model';

export enum ChannelMemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('channel_members')
@Unique(['channel_id', 'user_id'])
export class ChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  channel_id: string;

  @ManyToOne(() => Channel, channel => channel.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ChannelMemberRole,
    default: ChannelMemberRole.MEMBER,
  })
  role: ChannelMemberRole;

  @CreateDateColumn({ type: 'timestamp' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_read_at: Date | null;

  // Mark messages as read
  markAsRead(): void {
    this.last_read_at = new Date();
  }
}
