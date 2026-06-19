import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import socketService from '../services/socket.service';
import * as chatApi from '../api/chat.api';
import { useAuth } from './AuthContext';
import type { Channel, Message, EditMessageData, DeleteMessageData } from '../types/chat.types';
import { MessageType } from '../types/chat.types';
import { playNotificationSound } from '../utils/audio';

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
  renameChannel: (channelId: string, name: string) => Promise<void>;

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
  const socketRef = useRef<Socket | null>(null);
  const channelsRef = useRef<Channel[]>([]);
  const loadChannelsRef = useRef<(silent?: boolean) => void>(() => {});
  const loadMessagesRef = useRef<(id: string, silent?: boolean) => void>(() => {});
  // Sequence counter — prevents stale loadChannels responses from overwriting fresh ones
  const loadChannelsSeqRef = useRef(0);

  // Persist channel activity timestamps across panel open/close
  const STORAGE_KEY = 'chat_channel_activity';
  type StoredChannel = { ts: string; preview?: string; senderId?: string };
  const getStoredActivity = (): Record<string, StoredChannel> => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  };
  const setStoredActivity = (channelId: string, ts: string, preview?: string, senderId?: string) => {
    const map = getStoredActivity();
    map[channelId] = { ts, preview, senderId };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  };

  // Keep refs in sync with state
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);
  useEffect(() => { isPanelOpenRef.current = isPanelOpen; }, [isPanelOpen]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

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

    // Re-join all channels on reconnect (socket loses room membership after disconnect)
    socket.on('connect', () => {
      socket.emit('chat:join_channels');
      // Recover anything missed while the socket was down (reconnect after a
      // server wake-up / network blip): refresh the channel list (unread badges)
      // and the currently-open conversation's messages.
      loadChannelsRef.current(true);
      const active = activeChannelRef.current;
      if (active) loadMessagesRef.current(active.id, true);
    });

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

      // New conversation we don't know yet (first message in a fresh DM/channel)
      // → pull the channel list so it shows up without a refresh.
      if (data.channelId && !channelsRef.current.some((c) => c.id === data.channelId)) {
        loadChannelsRef.current();
      }

      // Add message to state if it's for the active channel (use ref to avoid stale closure)
      // De-dupe by id (covers the sender's own echo + file-upload reload) and
      // replace any matching optimistic (temp-*) message.
      if (data.channelId === activeChannelRef.current?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          const withoutTemp = prev.filter(
            (m) =>
              !(
                m.id.startsWith('temp-') &&
                m.sender_id === data.message.sender_id &&
                m.content === data.message.content
              )
          );
          return [...withoutTemp, data.message];
        });
      }

      // NOTE: unread count + sound are handled by the reliable per-user
      // 'notification:chat_message' event (channel-room delivery here is not
      // guaranteed to reach a recipient who isn't actively in the room).

      // Bump channel to top + update preview + persist to localStorage
      const ts = data.message.created_at || new Date().toISOString();
      const rawContent = data.message.content || '';
      const preview = rawContent.length > 60 ? rawContent.slice(0, 60) + '…' : rawContent;
      const senderId = data.message.sender_id;
      setStoredActivity(data.channelId, ts, preview, senderId);
      setChannels((prev) => {
        const idx = prev.findIndex((ch) => ch.id === data.channelId);
        if (idx < 0) return prev;
        const updated = [...prev];
        const [ch] = updated.splice(idx, 1);
        return [{ ...ch, last_message_at: ts, last_message_preview: preview, last_message_sender_id: senderId }, ...updated];
      });
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

    // Chat & meet toast notifications.
    // This is the reliable per-user event (sent to the recipient's personal room),
    // so it also drives the live unread badge + sound + channel-list bump.
    socket.on('notification:chat_message', (data: any) => {
      const channelId = data.channelId;
      const isActive = channelId === activeChannelRef.current?.id && isPanelOpenRef.current;
      if (channelId && !isActive) {
        setUnreadMessages((prev) => {
          const m = new Map(prev);
          m.set(channelId, (m.get(channelId) || 0) + 1);
          return m;
        });
        playNotificationSound();
        const ts = new Date().toISOString();
        setStoredActivity(channelId, ts, data.preview, data.senderId);
        // Unknown channel (new conversation) → fetch it so it appears in the list
        if (!channelsRef.current.some((c) => c.id === channelId)) {
          loadChannelsRef.current();
        }
        setChannels((prev) => {
          const idx = prev.findIndex((ch) => ch.id === channelId);
          if (idx < 0) return prev;
          const updated = [...prev];
          const [ch] = updated.splice(idx, 1);
          return [{ ...ch, last_message_at: ts, last_message_preview: data.preview, last_message_sender_id: data.senderId }, ...updated];
        });
      }
      window.dispatchEvent(new CustomEvent('chatmeet:notification', {
        detail: { type: 'chat_message', ...data },
      }));
    });

    socket.on('notification:meeting_invitation', (data: any) => {
      window.dispatchEvent(new CustomEvent('chatmeet:notification', {
        detail: { type: 'meeting_invitation', ...data },
      }));
    });

    socket.on('notification:meeting_scheduled', (data: any) => {
      window.dispatchEvent(new CustomEvent('chatmeet:notification', {
        detail: { type: 'meeting_scheduled', ...data },
      }));
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
      // If it's the current user's status, sync the dashboard widget too
      if (data.userId === userRef.current?.id) {
        window.dispatchEvent(new CustomEvent('status-changed', { detail: data.status }));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('chat:channels_joined');
      socket.off('chat:channel_joined');
      socket.off('notification:chat_message');
      socket.off('notification:meeting_invitation');
      socket.off('notification:meeting_scheduled');
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
  const loadChannels = useCallback(async (silent = false) => {
    const seq = ++loadChannelsSeqRef.current;
    try {
      if (!silent) setLoading(true);
      const fetchedChannels = await chatApi.getChannels();
      // Ignore response if a newer loadChannels call was made in the meantime
      if (seq !== loadChannelsSeqRef.current) return;
      // Merge locally cached activity timestamps + previews (survive panel close/open)
      const stored = getStoredActivity();
      const merged = fetchedChannels.map((ch) => {
        const local = stored[ch.id];
        const serverTs = ch.last_message_at;
        const localTs = local?.ts;
        const useLocal = localTs && serverTs
          ? new Date(localTs) > new Date(serverTs)
          : !!localTs;
        const best = useLocal ? localTs! : (serverTs || null);
        const preview = useLocal ? (local?.preview ?? ch.last_message_preview) : ch.last_message_preview;
        const senderId = useLocal ? (local?.senderId ?? ch.last_message_sender_id) : ch.last_message_sender_id;
        return { ...ch, last_message_at: best, last_message_preview: preview, last_message_sender_id: senderId };
      }).sort((a, b) => {
        const aT = new Date((a.last_message_at as string) || a.created_at).getTime();
        const bT = new Date((b.last_message_at as string) || b.created_at).getTime();
        return bT - aT;
      });
      setChannels(merged);
      // Seed unread counts from the server so the chat bubble + "Chat & Meet"
      // badge are correct right after load/refresh (not only after a live message)
      setUnreadMessages(() => {
        const map = new Map<string, number>();
        merged.forEach((ch) => {
          const count = ch.unreadCount ?? 0;
          if (count > 0) map.set(ch.id, count);
        });
        return map;
      });
      setError(null);
    } catch (err: any) {
      if (seq !== loadChannelsSeqRef.current) return;
      console.error('Failed to load channels:', err);
      setError(err.response?.data?.message || 'Failed to load channels');
    } finally {
      if (seq === loadChannelsSeqRef.current && !silent) setLoading(false);
    }
  }, []);

  // Keep a ref to loadChannels so socket handlers can fetch a freshly-created
  // channel (new conversation) without re-subscribing the socket listeners.
  useEffect(() => { loadChannelsRef.current = loadChannels; }, [loadChannels]);

  // Load channels (and seed the unread badge) as soon as the user is authenticated,
  // independent of the chat panel being opened — otherwise the "Chat & Meet" badge
  // and bubble stay empty after a refresh until a new live message arrives.
  useEffect(() => {
    if (user) loadChannels();
  }, [user, loadChannels]);

  // Safety-net poll: refresh the channel list (unread badges + previews) every
  // 30s while logged in. If a live socket event is ever missed (flaky network,
  // backgrounded tab, server blip), the UI still self-heals within ~30s instead
  // of staying stale until a manual refresh. Also refresh the open conversation.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadChannelsRef.current(true);
      const active = activeChannelRef.current;
      if (active && isPanelOpenRef.current) loadMessagesRef.current(active.id, true);
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load messages for a channel. `silent` = background refresh (poll/reconnect):
  // no loading spinner, and only update state if the messages actually changed
  // (avoids flicker / scroll jump when nothing new arrived).
  const loadMessages = useCallback(async (channelId: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await chatApi.getChannelMessages(channelId, 50, 0);
      if (silent) {
        setMessages((prev) => {
          const a = prev[prev.length - 1];
          const b = data.messages[data.messages.length - 1];
          if (prev.length === data.messages.length && a?.id === b?.id) return prev;
          return data.messages;
        });
      } else {
        setMessages(data.messages); // Already in chronological order from API
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      if (!silent) setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessagesRef.current = loadMessages; }, [loadMessages]);

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
      // Refresh channel list from server to guarantee it's in sync
      await loadChannels();
      setActiveChannel(channel);
      return channel;
    } catch (err: any) {
      console.error('Failed to create direct channel:', err);
      setError(err.response?.data?.message || 'Failed to create direct channel');
      return null;
    }
  }, [loadChannels, setActiveChannel]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string, channelId?: string) => {
      const targetChannelId = channelId || activeChannelRef.current?.id;
      if (!targetChannelId || !content.trim()) return;

      // Optimistic update — show message immediately before server confirms
      const currentUser = userRef.current;
      const tempId = `temp-${Date.now()}`;
      if (targetChannelId === activeChannelRef.current?.id && currentUser) {
        const tempMessage: Message = {
          id: tempId,
          channel_id: targetChannelId,
          sender_id: currentUser.id,
          content,
          message_type: MessageType.TEXT,
          parent_message_id: null,
          is_edited: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sender: currentUser,
          attachments: [],
        };
        setMessages((prev) => [...prev, tempMessage]);
      }

      // Optimistically bump channel to top + update preview + persist to localStorage
      const now = new Date().toISOString();
      const sentPreview = content.length > 60 ? content.slice(0, 60) + '…' : content;
      const currentUserId = userRef.current?.id || '';
      setStoredActivity(targetChannelId, now, sentPreview, currentUserId);
      setChannels((prev) => {
        const idx = prev.findIndex((ch) => ch.id === targetChannelId);
        if (idx <= 0) return prev;
        const updated = [...prev];
        const [ch] = updated.splice(idx, 1);
        return [{ ...ch, last_message_at: now, last_message_preview: sentPreview, last_message_sender_id: currentUserId }, ...updated];
      });

      // Send via REST so persistence is reliable (the server broadcasts over sockets).
      // Avoids the message being lost when a socket emit is dropped on reconnect.
      try {
        await chatApi.sendMessage(targetChannelId, content);
        // success: the broadcast (chat:new_message) replaces the optimistic temp by id
      } catch (err: any) {
        // remove the optimistic message and surface the failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(err?.response?.data?.message || 'Nie udało się wysłać wiadomości');
        setTimeout(() => setError(null), 5000);
      }
    },
    []
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

  // Mark channel as read — uses a ref so it always sees the live socket
  // (callers like setActiveChannel capture this once; a stale null-socket
  // closure would silently skip the emit and leave last_read_at unchanged).
  const markAsRead = useCallback((channelId: string) => {
    const s = socketRef.current;
    if (s) s.emit('chat:mark_read', { channelId });
    // Persist via REST too, so it works even if the socket isn't ready yet
    chatApi.markChannelRead(channelId).catch(() => {});
  }, []);

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

  // Rename a group channel
  const renameChannel = useCallback(async (channelId: string, name: string) => {
    try {
      const updatedChannel = await chatApi.renameChannel(channelId, name);
      setChannels((prev) => prev.map((ch) => (ch.id === channelId ? updatedChannel : ch)));
      if (activeChannel?.id === channelId) {
        setActiveChannelState(updatedChannel);
      }
    } catch (err: any) {
      console.error('Failed to rename channel:', err);
      throw new Error(err.response?.data?.message || 'Failed to rename channel');
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
    renameChannel,
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
