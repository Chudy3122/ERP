import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Attachment } from '../models/Attachment.model';
import { Message } from '../models/Message.model';
import { deleteFile } from '../config/multer';

export class FileService {
  private attachmentRepository: Repository<Attachment>;
  private messageRepository: Repository<Message>;

  constructor() {
    this.attachmentRepository = AppDataSource.getRepository(Attachment);
    this.messageRepository = AppDataSource.getRepository(Message);
  }

  /**
   * Create attachment records for uploaded files
   */
  async createAttachments(
    files: Express.Multer.File[],
    messageId: string,
    userId: string
  ): Promise<Attachment[]> {
    const attachments = files.map((file) => {
      return this.attachmentRepository.create({
        message_id: messageId,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        storage_key: file.filename,
        file_url: `/uploads/attachments/${file.filename}`,
        uploaded_by: userId,
      });
    });

    return await this.attachmentRepository.save(attachments);
  }

  /**
   * Get attachment by ID
   */
  async getAttachmentById(attachmentId: string): Promise<Attachment | null> {
    return await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['message', 'uploader'],
    });
  }

  /**
   * Get all attachments for a message
   */
  async getMessageAttachments(messageId: string): Promise<Attachment[]> {
    return await this.attachmentRepository.find({
      where: { message_id: messageId },
      relations: ['uploader'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Delete attachment
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.attachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ['message'],
    });

    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check if user is the uploader or message sender
    if (attachment.uploaded_by !== userId && attachment.message.sender_id !== userId) {
      throw new Error('Unauthorized to delete this attachment');
    }

    // Delete file from storage
    try {
      await deleteFile(attachment.storage_key);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await this.attachmentRepository.remove(attachment);
  }

  /**
   * Delete all attachments for a message
   */
  async deleteMessageAttachments(messageId: string): Promise<void> {
    const attachments = await this.attachmentRepository.find({
      where: { message_id: messageId },
    });

    // Delete all files from storage
    await Promise.all(
      attachments.map(async (attachment) => {
        try {
          await deleteFile(attachment.storage_key);
        } catch (error) {
          console.error(`Failed to delete file ${attachment.storage_key}:`, error);
        }
      })
    );

    // Delete from database
    await this.attachmentRepository.remove(attachments);
  }

  /**
   * Get storage statistics for a user
   */
  async getUserStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    sizeFormatted: string;
  }> {
    const result = await this.attachmentRepository
      .createQueryBuilder('attachment')
      .select('COUNT(attachment.id)', 'totalFiles')
      .addSelect('SUM(attachment.file_size)', 'totalSize')
      .where('attachment.uploaded_by = :userId', { userId })
      .getRawOne();

    const totalSize = parseInt(result.totalSize) || 0;
    const sizeFormatted = this.formatFileSize(totalSize);

    return {
      totalFiles: parseInt(result.totalFiles) || 0,
      totalSize,
      sizeFormatted,
    };
  }

  /**
   * Format file size to human-readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
