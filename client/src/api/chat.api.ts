import apiClient from './axios-config';
import type {
  Channel,
  Message,
  CreateChannelRequest,
  CreateDirectChannelRequest,
  AddChannelMembersRequest,
} from '../types/chat.types';

/**
 * Get all channels for the current user
 * @returns Array of channels
 */
export const getChannels = async (): Promise<Channel[]> => {
  const response = await apiClient.get('/chat/channels');
  return response.data.data;
};

/**
 * Get a specific channel by ID
 * @param channelId - Channel ID
 * @returns Channel details
 */
export const getChannelById = async (channelId: string): Promise<Channel> => {
  const response = await apiClient.get(`/chat/channels/${channelId}`);
  return response.data.data;
};

/**
 * Get messages for a specific channel with pagination
 * @param channelId - Channel ID
 * @param limit - Number of messages to fetch (default: 50)
 * @param offset - Offset for pagination (default: 0)
 * @returns Object with messages array and pagination info
 */
export const getChannelMessages = async (
  channelId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ messages: Message[]; total: number; limit: number; offset: number }> => {
  const response = await apiClient.get(`/chat/channels/${channelId}/messages`, {
    params: { limit, offset },
  });
  return response.data.data;
};

/**
 * Create a new channel (group, public, or private)
 * @param data - Channel creation data
 * @returns Created channel
 */
export const createChannel = async (data: CreateChannelRequest): Promise<Channel> => {
  const response = await apiClient.post('/chat/channels', data);
  return response.data.data;
};

/**
 * Create or get a direct message channel with another user
 * @param data - Direct channel data with userId
 * @returns Direct channel (existing or newly created)
 */
export const createDirectChannel = async (data: CreateDirectChannelRequest): Promise<Channel> => {
  const response = await apiClient.post('/chat/channels/direct', data);
  return response.data.data;
};

/**
 * Add members to a channel
 * @param channelId - Channel ID
 * @param data - Member data with userIds array
 * @returns Updated channel
 */
export const addChannelMembers = async (
  channelId: string,
  data: AddChannelMembersRequest
): Promise<Channel> => {
  const response = await apiClient.post(`/chat/channels/${channelId}/members`, data);
  return response.data.data;
};

/**
 * Remove a member from a channel
 * @param channelId - Channel ID
 * @param userId - User ID to remove
 * @returns Success message
 */
export const removeChannelMember = async (
  channelId: string,
  userId: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/chat/channels/${channelId}/members/${userId}`);
  return response.data;
};

export default {
  getChannels,
  getChannelById,
  getChannelMessages,
  createChannel,
  createDirectChannel,
  addChannelMembers,
  removeChannelMember,
};
