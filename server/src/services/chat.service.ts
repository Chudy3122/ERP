import { AppDataSource } from '../config/database';
import { Channel, ChannelType } from '../models/Channel.model';
import { ChannelMember, ChannelMemberRole } from '../models/ChannelMember.model';
import { Message, MessageType } from '../models/Message.model';
import { MessageReaction } from '../models/MessageReaction.model';
import { User } from '../models/User.model';

export class ChatService {
  private channelRepository = AppDataSource.getRepository(Channel);
  private channelMemberRepository = AppDataSource.getRepository(ChannelMember);
  private messageRepository = AppDataSource.getRepository(Message);
  private messageReactionRepository = AppDataSource.getRepository(MessageReaction);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get all channels for a user
   */
  async getUserChannels(userId: string) {
    const memberships = await this.channelMemberRepository.find({
      where: { user_id: userId },
      relations: ['channel', 'channel.creator', 'channel.members', 'channel.members.user'],
      order: { joined_at: 'DESC' },
    });

    const channels = memberships
      .map(m => m.channel)
      .filter(channel => channel && channel.is_active !== false);

    if (channels.length === 0) return channels;

    // Compute last_message_at for each channel from the messages table
    const channelIds = channels.map(c => c.id);
    const latestMessages = await this.messageRepository
      .createQueryBuilder('msg')
      .select('msg.channel_id', 'channelId')
      .addSelect('MAX(msg.created_at)', 'lastAt')
      .where('msg.channel_id IN (:...channelIds)', { channelIds })
      .groupBy('msg.channel_id')
      .getRawMany();

    const lastMessageMap = new Map<string, string>(
      latestMessages.map(r => [r.channelId, r.lastAt])
    );

    // Unread count per channel: messages newer than this user's last_read_at,
    // not sent by the user. Powers the chat bubble + "Chat & Meet" badge on load.
    const unreadRaw = await this.messageRepository
      .createQueryBuilder('msg')
      .select('msg.channel_id', 'channelId')
      .addSelect('COUNT(*)', 'cnt')
      .innerJoin('channel_members', 'cm', 'cm.channel_id = msg.channel_id AND cm.user_id = :userId', { userId })
      .where('msg.channel_id IN (:...channelIds)', { channelIds })
      .andWhere('msg.sender_id != :userId', { userId })
      .andWhere('(cm.last_read_at IS NULL OR msg.created_at > cm.last_read_at)')
      .groupBy('msg.channel_id')
      .getRawMany();

    const unreadMap = new Map<string, number>(
      unreadRaw.map(r => [r.channelId, parseInt(r.cnt, 10)])
    );

    // Attach last_message_at + unreadCount and sort by activity (most recent first)
    return channels
      .map(c => Object.assign(c, {
        last_message_at: lastMessageMap.get(c.id) ?? null,
        unreadCount: unreadMap.get(c.id) ?? 0,
      }))
      .sort((a, b) => {
        const aTime = new Date((a.last_message_at as string) || a.created_at).getTime();
        const bTime = new Date((b.last_message_at as string) || b.created_at).getTime();
        return bTime - aTime;
      });
  }

  /**
   * Mark a channel as read for a user (updates last_read_at → clears unread count)
   */
  async markChannelRead(channelId: string, userId: string): Promise<void> {
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });
    if (!membership) return;
    membership.last_read_at = new Date();
    await this.channelMemberRepository.save(membership);
  }

  /**
   * Create a new channel
   */
  async createChannel(data: {
    name: string;
    type: ChannelType;
    description?: string;
    createdBy: string;
    memberIds?: string[];
  }) {
    const { name, type, description, createdBy, memberIds = [] } = data;

    // Create channel
    const channel = this.channelRepository.create({
      name,
      type,
      description,
      created_by: createdBy,
    });

    await this.channelRepository.save(channel);

    // Add creator as admin
    const creatorMembership = this.channelMemberRepository.create({
      channel_id: channel.id,
      user_id: createdBy,
      role: ChannelMemberRole.ADMIN,
    });
    await this.channelMemberRepository.save(creatorMembership);

    // Add other members
    if (memberIds.length > 0) {
      const memberships = memberIds
        .filter(id => id !== createdBy)
        .map(userId =>
          this.channelMemberRepository.create({
            channel_id: channel.id,
            user_id: userId,
            role: ChannelMemberRole.MEMBER,
          })
        );

      await this.channelMemberRepository.save(memberships);
    }

    return this.getChannelById(channel.id, createdBy);
  }

  /**
   * Create or get direct message channel
   */
  async createDirectChannel(userId1: string, userId2: string) {
    // Find all direct channels where both users are members AND member count = 2
    const existingChannels = await this.channelRepository
      .createQueryBuilder('channel')
      .innerJoin('channel.members', 'member1', 'member1.user_id = :userId1', { userId1 })
      .innerJoin('channel.members', 'member2', 'member2.user_id = :userId2', { userId2 })
      .where('channel.type = :type', { type: ChannelType.DIRECT })
      .andWhere('channel.is_active = :active', { active: true })
      .andWhere(qb => {
        const sub = qb
          .subQuery()
          .select('COUNT(*)')
          .from('channel_members', 'cm')
          .where('cm.channel_id = channel.id')
          .getQuery();
        return `(${sub}) = 2`;
      })
      .orderBy('channel.created_at', 'ASC')
      .getMany();

    // Return oldest existing channel (handles pre-existing duplicates too)
    if (existingChannels.length > 0) {
      return this.getChannelById(existingChannels[0].id, userId1);
    }

    // Create new direct channel
    const user1 = await this.userRepository.findOne({ where: { id: userId1 } });
    const user2 = await this.userRepository.findOne({ where: { id: userId2 } });

    if (!user1 || !user2) {
      throw new Error('User not found');
    }

    const channelName = `${user1.first_name} & ${user2.first_name}`;

    return this.createChannel({
      name: channelName,
      type: ChannelType.DIRECT,
      createdBy: userId1,
      memberIds: [userId2],
    });
  }

  /**
   * Get channel by ID
   */
  async getChannelById(channelId: string, userId: string) {
    // Verify user is member
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership) {
      throw new Error('Not a member of this channel');
    }

    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: ['creator', 'members', 'members.user'],
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return channel;
  }

  /**
   * Get messages for a channel
   */
  async getChannelMessages(channelId: string, userId: string, limit = 50, offset = 0) {
    // Verify user is member
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership) {
      throw new Error('Not a member of this channel');
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { channel_id: channelId },
      relations: ['sender', 'attachments', 'reactions'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      messages: messages.reverse(), // Return in chronological order
      total,
      limit,
      offset,
    };
  }

  /**
   * Toggle a user's reaction on a message (one reaction per user — Messenger-style).
   * Same emoji again removes it; a different emoji replaces it. Returns channelId.
   */
  async toggleReaction(messageId: string, userId: string, emoji: string): Promise<{ channelId: string }> {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new Error('Message not found');

    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: message.channel_id, user_id: userId },
    });
    if (!membership) throw new Error('Not a member of this channel');

    const existing = await this.messageReactionRepository.findOne({
      where: { message_id: messageId, user_id: userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        await this.messageReactionRepository.remove(existing); // toggle off
      } else {
        existing.emoji = emoji; // replace with the new reaction
        await this.messageReactionRepository.save(existing);
      }
    } else {
      await this.messageReactionRepository.save(
        this.messageReactionRepository.create({ message_id: messageId, user_id: userId, emoji }),
      );
    }

    return { channelId: message.channel_id };
  }

  /** All reactions for a message (id, emoji, user_id) — used for broadcasting. */
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    return this.messageReactionRepository.find({ where: { message_id: messageId } });
  }

  /**
   * Add members to channel
   */
  async addChannelMembers(channelId: string, userId: string, memberIds: string[]) {
    // Verify user is admin of channel
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership || membership.role !== ChannelMemberRole.ADMIN) {
      throw new Error('Only channel admins can add members');
    }

    // Add members
    const memberships = memberIds.map(memberId =>
      this.channelMemberRepository.create({
        channel_id: channelId,
        user_id: memberId,
        role: ChannelMemberRole.MEMBER,
      })
    );

    await this.channelMemberRepository.save(memberships);

    // Return updated channel with members
    const updatedChannel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: ['members', 'members.user', 'creator'],
    });

    return updatedChannel;
  }

  /**
   * Remove member from channel
   */
  async removeChannelMember(channelId: string, userId: string, memberIdToRemove: string) {
    // Verify user is admin or removing themselves
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership) {
      throw new Error('Not a member of this channel');
    }

    if (membership.role !== ChannelMemberRole.ADMIN && userId !== memberIdToRemove) {
      throw new Error('Only channel admins can remove other members');
    }

    const membershipToRemove = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: memberIdToRemove },
    });

    if (membershipToRemove) {
      await this.channelMemberRepository.remove(membershipToRemove);
    }

    // Return updated channel with members
    const updatedChannel = await this.channelRepository.findOne({
      where: { id: channelId },
      relations: ['members', 'members.user', 'creator'],
    });

    return updatedChannel;
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: string, userId: string) {
    // Verify user is member of channel
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership) {
      throw new Error('You are not a member of this channel');
    }

    // Get channel to check type
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // For group channels, only admins can delete
    if (channel.type !== ChannelType.DIRECT && membership.role !== ChannelMemberRole.ADMIN) {
      throw new Error('Only channel admins can delete group channels');
    }

    // Soft delete the channel
    channel.is_active = false;
    await this.channelRepository.save(channel);

    return { message: 'Channel deleted successfully' };
  }

  /**
   * Rename a group channel (any member may rename; DMs can't be renamed).
   */
  async renameChannel(channelId: string, userId: string, name: string) {
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });
    if (!membership) {
      throw new Error('You are not a member of this channel');
    }

    const channel = await this.channelRepository.findOne({ where: { id: channelId } });
    if (!channel) {
      throw new Error('Channel not found');
    }
    if (channel.type === ChannelType.DIRECT) {
      throw new Error('Nie można zmienić nazwy rozmowy bezpośredniej');
    }
    // Any member of the group may rename it.

    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Nazwa nie może być pusta');
    if (trimmed.length > 100) throw new Error('Nazwa może mieć maksymalnie 100 znaków');

    channel.name = trimmed;
    await this.channelRepository.save(channel);

    return this.channelRepository.findOne({
      where: { id: channelId },
      relations: ['members', 'members.user', 'creator'],
    });
  }

  /**
   * Create a new message
   */
  async createMessage(
    channelId: string,
    senderId: string,
    content: string,
    messageType: MessageType = MessageType.TEXT
  ): Promise<Message> {
    const message = this.messageRepository.create({
      channel_id: channelId,
      sender_id: senderId,
      content,
      message_type: messageType,
    });

    return await this.messageRepository.save(message);
  }

  /**
   * Get message by ID with all relations
   */
  async getMessageById(messageId: string): Promise<Message | null> {
    return await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'attachments', 'attachments.uploader'],
    });
  }
}
