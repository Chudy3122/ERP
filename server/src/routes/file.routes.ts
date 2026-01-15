import { Router } from 'express';
import fileController from '../controllers/file.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { upload } from '../config/multer';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Upload files (supports multiple files)
router.post('/upload', upload.array('files', 5) as any, fileController.uploadFiles);

// Get attachment by ID
router.get('/:id', fileController.getAttachment);

// Download file
router.get('/:id/download', fileController.downloadFile);

// Delete attachment
router.delete('/:id', fileController.deleteAttachment);

// Get user storage stats
router.get('/stats', fileController.getUserStats);

export default router;
