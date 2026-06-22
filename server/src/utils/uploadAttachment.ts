import fs from 'fs';
import { cloudinary } from '../config/cloudinary';

/**
 * Upload a multer (disk) file to Cloudinary and return its public URL.
 * Render's disk is ephemeral (wiped on every redeploy), so attachments MUST go
 * to Cloudinary to survive. resource_type 'auto' handles images, PDFs, docs, etc.
 * The local temp file is removed afterwards.
 */
export async function uploadAttachmentToCloudinary(file: Express.Multer.File): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'erp-attachments',
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });
    return result.secure_url;
  } finally {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
  }
}
