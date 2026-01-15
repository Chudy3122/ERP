import { User } from './auth.types';

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface Channel {
  id: string;
  name: string | null;
  type: ChannelType;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  creator?: User;
  members?: ChannelMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  last_read_at: string | null;
  user?: User;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  parent_message_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender?: User;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  storage_key: string;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface SendMessageData {
  channelId: string;
  content: string;
  messageType?: MessageType;
}

export interface TypingData {
  channelId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface EditMessageData {
  messageId: string;
  content: string;
}

export interface DeleteMessageData {
  messageId: string;
}

export interface CreateChannelRequest {
  name: string;
  type: ChannelType;
  description?: string;
  memberIds?: string[];
}

export interface CreateDirectChannelRequest {
  userId: string;
}

export interface AddChannelMembersRequest {
  memberIds: string[];
}
