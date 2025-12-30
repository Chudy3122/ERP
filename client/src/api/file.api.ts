import apiClient from './axios-config';
import type { Message, Attachment } from '../types/chat.types';

/**
 * Upload files and create message with attachments
 * @param channelId - Channel ID
 * @param files - Files to upload
 * @param content - Optional message content
 * @returns Message with attachments
 */
export const uploadFiles = async (
  channelId: string,
  files: File[],
  content?: string
): Promise<{ message: Message; attachments: Attachment[] }> => {
  const formData = new FormData();
  formData.append('channelId', channelId);

  if (content) {
    formData.append('content', content);
  }

  files.forEach((file) => {
    formData.append('files', file);
  });

  const response = await apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data;
};

/**
 * Get attachment by ID
 * @param attachmentId - Attachment ID
 * @returns Attachment
 */
export const getAttachment = async (attachmentId: string): Promise<Attachment> => {
  const response = await apiClient.get(`/files/${attachmentId}`);
  return response.data.data;
};

/**
 * Download file
 * @param attachmentId - Attachment ID
 * @returns File blob
 */
export const downloadFile = async (attachmentId: string): Promise<Blob> => {
  const response = await apiClient.get(`/files/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Delete attachment
 * @param attachmentId - Attachment ID
 */
export const deleteAttachment = async (attachmentId: string): Promise<void> => {
  await apiClient.delete(`/files/${attachmentId}`);
};

/**
 * Get user storage stats
 * @returns Storage statistics
 */
export const getUserStorageStats = async (): Promise<{
  totalFiles: number;
  totalSize: number;
  sizeFormatted: string;
}> => {
  const response = await apiClient.get('/files/stats');
  return response.data.data;
};

export default {
  uploadFiles,
  getAttachment,
  downloadFile,
  deleteAttachment,
  getUserStorageStats,
};
