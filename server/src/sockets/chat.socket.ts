import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../config/socket';
import { AppDataSource } from '../config/database';
import { Message, MessageType } from '../models/Message.model';
import { Channel } from '../models/Channel.model';
import { ChannelMember } from '../models/ChannelMember.model';

interface SendMessageData {
  channelId: string;
  content: string;
  messageType?: MessageType;
  parentMessageId?: string;
}

interface TypingData {
  channelId: string;
  isTyping: boolean;
}

interface JoinChannelData {
  channelId: string;
}

export const setupChatHandlers = (io: SocketIOServer) => {
  const messageRepository = AppDataSource.getRepository(Message);
  const channelRepository = AppDataSource.getRepository(Channel);
  const channelMemberRepository = AppDataSource.getRepository(ChannelMember);

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.userId;

    console.log(`📱 Setting up chat handlers for user: ${socket.user.email}`);

    // Join user's channels
    socket.on('chat:join_channels', async () => {
      try {
        // Get all channels user is member of
        const memberships = await channelMemberRepository.find({
          where: { user_id: userId },
          relations: ['channel'],
        });

        // Join each channel room
        for (const membership of memberships) {
          const roomName = `channel:${membership.channel_id}`;
          socket.join(roomName);
          console.log(`   Joined channel room: ${roomName}`);
        }

        socket.emit('chat:channels_joined', {
          count: memberships.length,
          channels: memberships.map(m => m.channel_id),
        });
      } catch (error) {
        console.error('Error joining channels:', error);
        socket.emit('chat:error', { message: 'Failed to join channels' });
      }
    });

    // Join specific channel
    socket.on('chat:join_channel', async (data: JoinChannelData) => {
      try {
        const { channelId } = data;

        // Verify user is member of channel
        const membership = await channelMemberRepository.findOne({
          where: {
            channel_id: channelId,
            user_id: userId,
          },
        });

        if (!membership) {
          socket.emit('chat:error', { message: 'Not a member of this channel' });
          return;
        }

        const roomName = `channel:${channelId}`;
        socket.join(roomName);

        console.log(`   User ${userId} joined channel: ${channelId}`);

        socket.emit('chat:channel_joined', { channelId });
      } catch (error) {
        console.error('Error joining channel:', error);
        socket.emit('chat:error', { message: 'Failed to join channel' });
      }
    });

    // Leave channel
    socket.on('chat:leave_channel', (data: JoinChannelData) => {
      const { channelId } = data;
      const roomName = `channel:${channelId}`;
      socket.leave(roomName);

      console.log(`   User ${userId} left channel: ${channelId}`);
      socket.emit('chat:channel_left', { channelId });
    });

    // Send message
    socket.on('chat:send_message', async (data: SendMessageData) => {
      try {
        const { channelId, content, messageType = MessageType.TEXT, parentMessageId } = data;

        // Verify user is member of channel
        const membership = await channelMemberRepository.findOne({
          where: {
            channel_id: channelId,
            user_id: userId,
          },
        });

        if (!membership) {
          socket.emit('chat:error', { message: 'Not a member of this channel' });
          return;
        }

        // Create message
        const message = messageRepository.create({
          channel_id: channelId,
          sender_id: userId,
          content,
          message_type: messageType,
          parent_message_id: parentMessageId || null,
        });

        await messageRepository.save(message);

        // Load message with sender info
        const savedMessage = await messageRepository.findOne({
          where: { id: message.id },
          relations: ['sender', 'attachments'],
        });

        if (!savedMessage) {
          throw new Error('Failed to load saved message');
        }

        // Broadcast to channel room
        io.to(`channel:${channelId}`).emit('chat:new_message', {
          message: savedMessage,
          channelId,
        });

        console.log(`   Message sent in channel ${channelId} by ${userId}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('chat:typing', async (data: TypingData) => {
      try {
        const { channelId, isTyping } = data;

        // Verify user is member of channel
        const membership = await channelMemberRepository.findOne({
          where: {
            channel_id: channelId,
            user_id: userId,
          },
        });

        if (!membership) return;

        // Broadcast to channel room (except sender)
        socket.to(`channel:${channelId}`).emit('chat:user_typing', {
          channelId,
          userId,
          userName: socket.user?.email,
          isTyping,
        });
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // Edit message
    socket.on('chat:edit_message', async (data: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = data;

        const message = await messageRepository.findOne({
          where: { id: messageId },
          relations: ['sender'],
        });

        if (!message) {
          socket.emit('chat:error', { message: 'Message not found' });
          return;
        }

        // Only sender can edit
        if (message.sender_id !== userId) {
          socket.emit('chat:error', { message: 'You can only edit your own messages' });
          return;
        }

        message.edit(content);
        await messageRepository.save(message);

        // Broadcast to channel
        io.to(`channel:${message.channel_id}`).emit('chat:message_edited', {
          messageId,
          content,
          channelId: message.channel_id,
        });

        console.log(`   Message ${messageId} edited by ${userId}`);
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('chat:error', { message: 'Failed to edit message' });
      }
    });

    // Delete message
    socket.on('chat:delete_message', async (data: { messageId: string }) => {
      try {
        const { messageId } = data;

        const message = await messageRepository.findOne({
          where: { id: messageId },
        });

        if (!message) {
          socket.emit('chat:error', { message: 'Message not found' });
          return;
        }

        // Only sender can delete
        if (message.sender_id !== userId) {
          socket.emit('chat:error', { message: 'You can only delete your own messages' });
          return;
        }

        message.softDelete();
        await messageRepository.save(message);

        // Broadcast to channel
        io.to(`channel:${message.channel_id}`).emit('chat:message_deleted', {
          messageId,
          channelId: message.channel_id,
        });

        console.log(`   Message ${messageId} deleted by ${userId}`);
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('chat:error', { message: 'Failed to delete message' });
      }
    });

    // Mark messages as read
    socket.on('chat:mark_read', async (data: { channelId: string }) => {
      try {
        const { channelId } = data;

        const membership = await channelMemberRepository.findOne({
          where: {
            channel_id: channelId,
            user_id: userId,
          },
        });

        if (!membership) return;

        membership.markAsRead();
        await channelMemberRepository.save(membership);

        console.log(`   Channel ${channelId} marked as read by ${userId}`);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    console.log(`✅ Chat handlers set up for user: ${socket.user.email}`);
  });
};
