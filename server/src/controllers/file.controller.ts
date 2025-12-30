import { Request, Response } from 'express';
import { FileService } from '../services/file.service';
import { ChatService } from '../services/chat.service';
import { MessageType } from '../models/Message.model';
import path from 'path';
import fs from 'fs';

const fileService = new FileService();
const chatService = new ChatService();

export class FileController {
  /**
   * Upload files and create message with attachments
   * POST /api/files/upload
   */
  async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      const { channelId, content } = req.body;
      const userId = req.user!.id;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files provided',
        });
        return;
      }

      if (!channelId) {
        res.status(400).json({
          success: false,
          message: 'Channel ID is required',
        });
        return;
      }

      // Create message first (file type)
      const message = await chatService.createMessage(
        channelId,
        userId,
        content || `Sent ${files.length} file(s)`,
        MessageType.FILE
      );

      // Create attachments for the message
      const attachments = await fileService.createAttachments(files, message.id, userId);

      // Reload message with attachments
      const messageWithAttachments = await chatService.getMessageById(message.id);

      res.status(201).json({
        success: true,
        message: 'Files uploaded successfully',
        data: {
          message: messageWithAttachments,
          attachments,
        },
      });
    } catch (error: any) {
      console.error('Upload files error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload files',
      });
    }
  }

  /**
   * Get attachment by ID
   * GET /api/files/:id
   */
  async getAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const attachment = await fileService.getAttachmentById(id);

      if (!attachment) {
        res.status(404).json({
          success: false,
          message: 'Attachment not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: attachment,
      });
    } catch (error: any) {
      console.error('Get attachment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get attachment',
      });
    }
  }

  /**
   * Download/serve file
   * GET /api/files/:id/download
   */
  async downloadFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const attachment = await fileService.getAttachmentById(id);

      if (!attachment) {
        res.status(404).json({
          success: false,
          message: 'File not found',
        });
        return;
      }

      const filePath = path.join(__dirname, '../../uploads/attachments', attachment.storage_key);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'File not found on server',
        });
        return;
      }

      // Set headers
      res.setHeader('Content-Type', attachment.file_type);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
      res.setHeader('Content-Length', attachment.file_size.toString());

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error('Download file error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to download file',
      });
    }
  }

  /**
   * Delete attachment
   * DELETE /api/files/:id
   */
  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      await fileService.deleteAttachment(id, userId);

      res.status(200).json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete attachment error:', error);

      if (error.message === 'Attachment not found') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'Unauthorized to delete this attachment') {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete attachment',
      });
    }
  }

  /**
   * Get user storage statistics
   * GET /api/files/stats
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const stats = await fileService.getUserStorageStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get storage stats',
      });
    }
  }
}

export default new FileController();
