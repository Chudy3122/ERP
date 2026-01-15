import { AppDataSource } from '../config/database';
import { Channel, ChannelType } from '../models/Channel.model';
import { ChannelMember, ChannelMemberRole } from '../models/ChannelMember.model';
import { Message, MessageType } from '../models/Message.model';
import { User } from '../models/User.model';

export class ChatService {
  private channelRepository = AppDataSource.getRepository(Channel);
  private channelMemberRepository = AppDataSource.getRepository(ChannelMember);
  private messageRepository = AppDataSource.getRepository(Message);
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

    return memberships.map(m => m.channel);
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
    // Check if direct channel already exists
    const existingChannel = await this.channelRepository
      .createQueryBuilder('channel')
      .innerJoin('channel.members', 'member1', 'member1.user_id = :userId1', { userId1 })
      .innerJoin('channel.members', 'member2', 'member2.user_id = :userId2', { userId2 })
      .where('channel.type = :type', { type: ChannelType.DIRECT })
      .getOne();

    if (existingChannel) {
      return this.getChannelById(existingChannel.id, userId1);
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
      relations: ['sender', 'attachments'],
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
    // Verify user is admin of channel
    const membership = await this.channelMemberRepository.findOne({
      where: { channel_id: channelId, user_id: userId },
    });

    if (!membership || membership.role !== ChannelMemberRole.ADMIN) {
      throw new Error('Only channel admins can delete channels');
    }

    // Get channel to check type
    const channel = await this.channelRepository.findOne({
      where: { id: channelId },
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    // Don't allow deleting direct channels
    if (channel.type === ChannelType.DIRECT) {
      throw new Error('Cannot delete direct message channels');
    }

    // Soft delete the channel
    channel.is_active = false;
    await this.channelRepository.save(channel);

    return { message: 'Channel deleted successfully' };
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
