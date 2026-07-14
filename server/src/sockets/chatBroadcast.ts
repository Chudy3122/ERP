import { Server as SocketIOServer } from 'socket.io';
import { AppDataSource } from '../config/database';
import { Message } from '../models/Message.model';
import { MessageReaction } from '../models/MessageReaction.model';
import { Channel } from '../models/Channel.model';
import { ChannelMember } from '../models/ChannelMember.model';
import { User } from '../models/User.model';
import notificationService from '../services/notification.service';

/**
 * Push updated reactions of a message to every channel member's personal room.
 */
export async function broadcastReactionUpdate(io: SocketIOServer, messageId: string): Promise<void> {
  const messageRepository = AppDataSource.getRepository(Message);
  const reactionRepository = AppDataSource.getRepository(MessageReaction);
  const channelMemberRepository = AppDataSource.getRepository(ChannelMember);

  const message = await messageRepository.findOne({ where: { id: messageId } });
  if (!message) return;

  const reactions = await reactionRepository.find({
    where: { message_id: messageId },
    relations: ['user'],
  });
  const payload = {
    messageId,
    channelId: message.channel_id,
    reactions: reactions.map((r) => ({
      id: r.id,
      emoji: r.emoji,
      user_id: r.user_id,
      user: r.user
        ? {
            id: r.user.id,
            email: r.user.email,
            first_name: r.user.first_name,
            last_name: r.user.last_name,
            avatar_url: r.user.avatar_url,
          }
        : undefined,
    })),
  };

  const members = await channelMemberRepository.find({ where: { channel_id: message.channel_id } });
  for (const member of members) {
    io.to(`user:${member.user_id}`).emit('chat:message_reaction', payload);
  }
}

/**
 * Deliver a new chat message to every channel member reliably.
 *
 * Messages are emitted to each member's PERSONAL room (`user:<id>`), which is
 * always joined on every (re)connection — unlike channel rooms, which depend on
 * the client having (re)joined them. This fixes messages not showing up without a
 * refresh (new conversations, reconnects) and makes file/image uploads (sent over
 * REST) appear in real time too.
 */
export async function broadcastNewMessage(io: SocketIOServer, messageId: string): Promise<void> {
  const messageRepository = AppDataSource.getRepository(Message);
  const channelRepository = AppDataSource.getRepository(Channel);
  const channelMemberRepository = AppDataSource.getRepository(ChannelMember);
  const userRepository = AppDataSource.getRepository(User);

  const message = await messageRepository.findOne({
    where: { id: messageId },
    relations: ['sender', 'attachments'],
  });
  if (!message) return;

  const channelId = message.channel_id;
  const channel = await channelRepository.findOne({ where: { id: channelId } });
  const sender = await userRepository.findOne({ where: { id: message.sender_id } });
  const senderName = sender ? `${sender.first_name} ${sender.last_name}` : 'Ktoś';

  const text = message.content || '';
  const hasAttachments = (message.attachments?.length || 0) > 0;
  const preview = text
    ? (text.length > 80 ? text.substring(0, 80) + '…' : text)
    : (hasAttachments ? '📎 Załącznik' : '');

  const members = await channelMemberRepository.find({ where: { channel_id: channelId } });

  for (const member of members) {
    // Full message to everyone (incl. sender — client de-dupes by id)
    io.to(`user:${member.user_id}`).emit('chat:new_message', { message, channelId });

    if (member.user_id === message.sender_id) continue;

    // Real-time toast/unread + persistent notification for the others
    io.to(`user:${member.user_id}`).emit('notification:chat_message', {
      senderId: message.sender_id,
      senderName,
      senderAvatar: (sender as any)?.avatar_url || null,
      channelId,
      channelType: channel?.type || 'direct',
      channelName: channel?.type === 'direct' ? senderName : (channel?.name || 'Kanał'),
      preview,
    });

    notificationService.notifyNewChatMessage(
      member.user_id,
      senderName,
      channel?.type === 'direct' ? senderName : (channel?.name || 'Kanał'),
      preview,
      channelId,
    ).catch(() => {});
  }
}
