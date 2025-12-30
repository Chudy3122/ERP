import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { ChannelType } from '../models/Channel.model';

const chatService = new ChatService();

/**
 * Get user's channels
 * GET /api/chat/channels
 */
export const getChannels = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const channels = await chatService.getUserChannels(req.user.userId);

    return res.status(200).json({ data: channels });
  } catch (error) {
    console.error('Get channels error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to get channels',
    });
  }
};

/**
 * Create new channel
 * POST /api/chat/channels
 */
export const createChannel = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, description, memberIds } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name and type are required',
      });
    }

    const channel = await chatService.createChannel({
      name,
      type,
      description,
      createdBy: req.user.userId,
      memberIds,
    });

    return res.status(201).json({
      message: 'Channel created successfully',
      data: channel,
    });
  } catch (error) {
    console.error('Create channel error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to create channel',
    });
  }
};

/**
 * Create or get direct message channel
 * POST /api/chat/channels/direct
 */
export const createDirectChannel = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'userId is required',
      });
    }

    const channel = await chatService.createDirectChannel(req.user.userId, userId);

    return res.status(200).json({ data: channel });
  } catch (error) {
    console.error('Create direct channel error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to create direct channel',
    });
  }
};

/**
 * Get channel by ID
 * GET /api/chat/channels/:id
 */
export const getChannelById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const channel = await chatService.getChannelById(id, req.user.userId);

    return res.status(200).json({ data: channel });
  } catch (error) {
    console.error('Get channel error:', error);
    return res.status(404).json({
      error: 'Not Found',
      message: error instanceof Error ? error.message : 'Channel not found',
    });
  }
};

/**
 * Get channel messages
 * GET /api/chat/channels/:id/messages
 */
export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const messages = await chatService.getChannelMessages(id, req.user.userId, limit, offset);

    return res.status(200).json({ data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to get messages',
    });
  }
};

/**
 * Add members to channel
 * POST /api/chat/channels/:id/members
 */
export const addChannelMembers = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'memberIds array is required',
      });
    }

    await chatService.addChannelMembers(id, req.user.userId, memberIds);

    return res.status(200).json({ message: 'Members added successfully' });
  } catch (error) {
    console.error('Add members error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to add members',
    });
  }
};

/**
 * Remove member from channel
 * DELETE /api/chat/channels/:id/members/:userId
 */
export const removeChannelMember = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, userId } = req.params;

    await chatService.removeChannelMember(id, req.user.userId, userId);

    return res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to remove member',
    });
  }
};
