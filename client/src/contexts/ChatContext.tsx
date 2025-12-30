import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socket.service';
import * as chatApi from '../api/chat.api';
import { useAuth } from './AuthContext';
import type { Channel, Message, SendMessageData, EditMessageData, DeleteMessageData } from '../types/chat.types';

interface TypingUser {
  userId: string;
  channelId: string;
  timestamp: number;
}

interface ChatContextType {
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  typingUsers: TypingUser[];
  isConnected: boolean;
  loading: boolean;
  error: string | null;

  // Channel operations
  setActiveChannel: (channel: Channel | null) => void;
  loadChannels: () => Promise<void>;
  loadMessages: (channelId: string) => Promise<void>;
  createChannel: (data: any) => Promise<Channel | null>;
  createDirectChannel: (userId: string) => Promise<Channel | null>;

  // Message operations
  sendMessage: (content: string, channelId?: string) => void;
  editMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;

  // WebSocket operations
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  sendTypingIndicator: (channelId?: string) => void;
  markAsRead: (channelId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannelState] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Socket.io connection when user is authenticated
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const newSocket = socketService.connect(token);
        setSocket(newSocket);
        setIsConnected(true);

        // Join all user's channels automatically
        newSocket.emit('chat:join_channels');

        return () => {
          socketService.disconnect();
          setIsConnected(false);
        };
      }
    }
  }, [user]);

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    // Channel events
    socket.on('chat:channels_joined', (data: { channels: string[] }) => {
      console.log('✅ Joined channels:', data.channels);
    });

    socket.on('chat:channel_joined', (data: { channelId: string }) => {
      console.log('✅ Joined channel:', data.channelId);
    });

    // Message events
    socket.on('chat:new_message', (data: { message: Message; channelId: string }) => {
      console.log('📨 New message:', data);

      // Add message to state if it's for the active channel
      if (data.channelId === activeChannel?.id) {
        setMessages((prev) => [...prev, data.message]);
      }

      // Update channel's last message
      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === data.channelId
            ? { ...channel, last_message_at: data.message.created_at }
            : channel
        )
      );
    });

    socket.on('chat:message_edited', (data: { message: Message; channelId: string }) => {
      console.log('✏️ Message edited:', data);

      if (data.channelId === activeChannel?.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.message.id ? data.message : msg))
        );
      }
    });

    socket.on('chat:message_deleted', (data: { messageId: string; channelId: string }) => {
      console.log('🗑️ Message deleted:', data);

      if (data.channelId === activeChannel?.id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, is_deleted: true, content: 'Message deleted' }
              : msg
          )
        );
      }
    });

    // Typing indicator
    socket.on('chat:user_typing', (data: { userId: string; channelId: string; username: string }) => {
      console.log('⌨️ User typing:', data);

      if (data.channelId === activeChannel?.id && data.userId !== user?.id) {
        setTypingUsers((prev) => [
          ...prev.filter((u) => u.userId !== data.userId),
          { userId: data.userId, channelId: data.channelId, timestamp: Date.now() },
        ]);

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }, 3000);
      }
    });

    // Error handling
    socket.on('chat:error', (data: { message: string }) => {
      console.error('❌ Chat error:', data.message);
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off('chat:channels_joined');
      socket.off('chat:channel_joined');
      socket.off('chat:new_message');
      socket.off('chat:message_edited');
      socket.off('chat:message_deleted');
      socket.off('chat:user_typing');
      socket.off('chat:error');
    };
  }, [socket, activeChannel, user]);

  // Load channels from REST API
  const loadChannels = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedChannels = await chatApi.getChannels();
      setChannels(fetchedChannels);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load channels:', err);
      setError(err.response?.data?.message || 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load messages for a channel
  const loadMessages = useCallback(async (channelId: string) => {
    try {
      setLoading(true);
      const data = await chatApi.getChannelMessages(channelId, 50, 0);
      setMessages(data.messages.reverse()); // Reverse to show oldest first
      setError(null);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set active channel and load its messages
  const setActiveChannel = useCallback(
    async (channel: Channel | null) => {
      if (channel) {
        setActiveChannelState(channel);
        await loadMessages(channel.id);
        joinChannel(channel.id);
        markAsRead(channel.id);
      } else {
        setActiveChannelState(null);
        setMessages([]);
      }
    },
    [loadMessages]
  );

  // Create a new channel
  const createChannel = useCallback(async (data: any): Promise<Channel | null> => {
    try {
      const newChannel = await chatApi.createChannel(data);
      setChannels((prev) => [...prev, newChannel]);
      joinChannel(newChannel.id);
      return newChannel;
    } catch (err: any) {
      console.error('Failed to create channel:', err);
      setError(err.response?.data?.message || 'Failed to create channel');
      return null;
    }
  }, []);

  // Create a direct channel with a user
  const createDirectChannel = useCallback(async (userId: string): Promise<Channel | null> => {
    try {
      const channel = await chatApi.createDirectChannel({ userId });

      // Check if channel already exists in state
      const existingChannel = channels.find((c) => c.id === channel.id);
      if (!existingChannel) {
        setChannels((prev) => [...prev, channel]);
      }

      setActiveChannel(channel);
      return channel;
    } catch (err: any) {
      console.error('Failed to create direct channel:', err);
      setError(err.response?.data?.message || 'Failed to create direct channel');
      return null;
    }
  }, [channels, setActiveChannel]);

  // Send a message
  const sendMessage = useCallback(
    (content: string, channelId?: string) => {
      const targetChannelId = channelId || activeChannel?.id;
      if (!targetChannelId || !socket) return;

      const messageData: SendMessageData = {
        channelId: targetChannelId,
        content,
        message_type: 'text',
      };

      socket.emit('chat:send_message', messageData);
    },
    [socket, activeChannel]
  );

  // Edit a message
  const editMessage = useCallback(
    (messageId: string, content: string) => {
      if (!socket) return;

      const editData: EditMessageData = {
        messageId,
        content,
      };

      socket.emit('chat:edit_message', editData);
    },
    [socket]
  );

  // Delete a message
  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socket) return;

      const deleteData: DeleteMessageData = {
        messageId,
      };

      socket.emit('chat:delete_message', deleteData);
    },
    [socket]
  );

  // Join a channel
  const joinChannel = useCallback(
    (channelId: string) => {
      if (!socket) return;
      socket.emit('chat:join_channel', { channelId });
    },
    [socket]
  );

  // Leave a channel
  const leaveChannel = useCallback(
    (channelId: string) => {
      if (!socket) return;
      socket.emit('chat:leave_channel', { channelId });
    },
    [socket]
  );

  // Send typing indicator
  const sendTypingIndicator = useCallback(
    (channelId?: string) => {
      const targetChannelId = channelId || activeChannel?.id;
      if (!targetChannelId || !socket) return;

      socket.emit('chat:typing', { channelId: targetChannelId });
    },
    [socket, activeChannel]
  );

  // Mark channel as read
  const markAsRead = useCallback(
    (channelId: string) => {
      if (!socket) return;
      socket.emit('chat:mark_read', { channelId });
    },
    [socket]
  );

  const value: ChatContextType = {
    channels,
    activeChannel,
    messages,
    typingUsers,
    isConnected,
    loading,
    error,
    setActiveChannel,
    loadChannels,
    loadMessages,
    createChannel,
    createDirectChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    joinChannel,
    leaveChannel,
    sendTypingIndicator,
    markAsRead,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export default ChatContext;
