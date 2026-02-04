import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socket.service';
import * as chatApi from '../api/chat.api';
import { useAuth } from './AuthContext';
import type { Channel, Message, SendMessageData, EditMessageData, DeleteMessageData } from '../types/chat.types';
import { MessageType } from '../types/chat.types';

interface TypingUser {
  userId: string;
  channelId: string;
  timestamp: number;
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy' | 'in_meeting';
  custom_message?: string;
}

interface ChatContextType {
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  typingUsers: TypingUser[];
  userStatuses: Map<string, UserStatus>;
  isConnected: boolean;
  loading: boolean;
  error: string | null;

  // Unread messages tracking
  unreadMessages: Map<string, number>;
  totalUnreadCount: number;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  clearUnreadForChannel: (channelId: string) => void;

  // Status helpers
  isUserOnline: (userId: string) => boolean;
  getUserStatus: (userId: string) => UserStatus | undefined;

  // Channel operations
  setActiveChannel: (channel: Channel | null) => void;
  loadChannels: () => Promise<void>;
  loadMessages: (channelId: string) => Promise<void>;
  createChannel: (data: any) => Promise<Channel | null>;
  createDirectChannel: (userId: string) => Promise<Channel | null>;
  addChannelMembers: (channelId: string, userIds: string[]) => Promise<void>;
  removeChannelMember: (channelId: string, userId: string) => Promise<void>;
  deleteChannelById: (channelId: string) => Promise<void>;

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
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(new Map());
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Refs to avoid stale closures in socket handlers
  const activeChannelRef = useRef<Channel | null>(null);
  const isPanelOpenRef = useRef(false);
  const userRef = useRef(user);

  // Keep refs in sync with state
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);
  useEffect(() => { isPanelOpenRef.current = isPanelOpen; }, [isPanelOpen]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Computed total unread count
  const totalUnreadCount = useMemo(() => {
    let total = 0;
    unreadMessages.forEach(count => total += count);
    return total;
  }, [unreadMessages]);

  // Clear unread for a specific channel
  const clearUnreadForChannel = useCallback((channelId: string) => {
    setUnreadMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(channelId);
      return newMap;
    });
  }, []);

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

        // Request online users status
        newSocket.emit('status:get_online_users');

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

      // Add message to state if it's for the active channel (use ref to avoid stale closure)
      if (data.channelId === activeChannelRef.current?.id) {
        setMessages((prev) => [...prev, data.message]);
      }

      // Track unread messages if:
      // - message is not from current user
      // - panel is closed OR different channel is active
      if (data.message.sender_id !== userRef.current?.id) {
        const isCurrentChannelActive = data.channelId === activeChannelRef.current?.id && isPanelOpenRef.current;
        if (!isCurrentChannelActive) {
          setUnreadMessages(prev => {
            const newMap = new Map(prev);
            newMap.set(data.channelId, (newMap.get(data.channelId) || 0) + 1);
            return newMap;
          });
        }
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

      if (data.channelId === activeChannelRef.current?.id) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.message.id ? data.message : msg))
        );
      }
    });

    socket.on('chat:message_deleted', (data: { messageId: string; channelId: string }) => {
      console.log('🗑️ Message deleted:', data);

      if (data.channelId === activeChannelRef.current?.id) {
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

      if (data.channelId === activeChannelRef.current?.id && data.userId !== userRef.current?.id) {
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

    // Status events
    socket.on('status:online_users', (data: { users: Array<{ userId: string; status: string; custom_message?: string }> }) => {
      console.log('📊 Online users received:', data.users.length);
      const newStatuses = new Map<string, UserStatus>();
      data.users.forEach((u) => {
        newStatuses.set(u.userId, {
          userId: u.userId,
          status: u.status as UserStatus['status'],
          custom_message: u.custom_message,
        });
      });
      setUserStatuses(newStatuses);
    });

    socket.on('status:user_status_changed', (data: { userId: string; status: string; custom_message?: string }) => {
      console.log('🔄 User status changed:', data.userId, data.status);
      setUserStatuses((prev) => {
        const newMap = new Map(prev);
        if (data.status === 'offline') {
          newMap.delete(data.userId);
        } else {
          newMap.set(data.userId, {
            userId: data.userId,
            status: data.status as UserStatus['status'],
            custom_message: data.custom_message,
          });
        }
        return newMap;
      });
    });

    return () => {
      socket.off('chat:channels_joined');
      socket.off('chat:channel_joined');
      socket.off('chat:new_message');
      socket.off('chat:message_edited');
      socket.off('chat:message_deleted');
      socket.off('chat:user_typing');
      socket.off('chat:error');
      socket.off('status:online_users');
      socket.off('status:user_status_changed');
    };
  }, [socket]); // Using refs instead of state, so only socket matters

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
      setMessages(data.messages); // Already in chronological order from API
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
        // Clear messages FIRST to prevent showing old messages
        setMessages([]);
        setActiveChannelState(channel);
        await loadMessages(channel.id);
        joinChannel(channel.id);
        markAsRead(channel.id);
        // Clear unread count for this channel
        clearUnreadForChannel(channel.id);
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
        messageType: MessageType.TEXT,
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

  // Add members to channel
  const addChannelMembers = useCallback(async (channelId: string, userIds: string[]) => {
    try {
      const updatedChannel = await chatApi.addChannelMembers(channelId, { memberIds: userIds });
      // Update channels list with new member data
      setChannels((prev) => prev.map((ch) => (ch.id === channelId ? updatedChannel : ch)));
      if (activeChannel?.id === channelId) {
        setActiveChannelState(updatedChannel);
      }
    } catch (err: any) {
      console.error('Failed to add members:', err);
      throw new Error(err.response?.data?.message || 'Failed to add members');
    }
  }, [activeChannel]);

  // Remove member from channel
  const removeChannelMember = useCallback(async (channelId: string, userId: string) => {
    try {
      const result = await chatApi.removeChannelMember(channelId, userId);
      // Update channels list with new member data
      if (result.data) {
        setChannels((prev) => prev.map((ch) => (ch.id === channelId ? result.data : ch)));
        if (activeChannel?.id === channelId) {
          setActiveChannelState(result.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      throw new Error(err.response?.data?.message || 'Failed to remove member');
    }
  }, [activeChannel]);

  // Delete channel
  const deleteChannelById = useCallback(async (channelId: string) => {
    try {
      await chatApi.deleteChannel(channelId);
      // Remove from channels list
      setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
      // Clear active channel if it was deleted
      if (activeChannel?.id === channelId) {
        setActiveChannelState(null);
        setMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to delete channel:', err);
      throw new Error(err.response?.data?.message || 'Failed to delete channel');
    }
  }, [activeChannel]);

  // Status helper functions
  const isUserOnline = useCallback((userId: string): boolean => {
    const status = userStatuses.get(userId);
    return status?.status === 'online' || status?.status === 'away' || status?.status === 'busy' || status?.status === 'in_meeting';
  }, [userStatuses]);

  const getUserStatus = useCallback((userId: string): UserStatus | undefined => {
    return userStatuses.get(userId);
  }, [userStatuses]);

  const value: ChatContextType = {
    channels,
    activeChannel,
    messages,
    typingUsers,
    userStatuses,
    isConnected,
    loading,
    error,
    unreadMessages,
    totalUnreadCount,
    isPanelOpen,
    setIsPanelOpen,
    clearUnreadForChannel,
    isUserOnline,
    getUserStatus,
    setActiveChannel,
    loadChannels,
    loadMessages,
    createChannel,
    createDirectChannel,
    addChannelMembers,
    removeChannelMember,
    deleteChannelById,
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
