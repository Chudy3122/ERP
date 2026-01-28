import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const userId = (req as any).user?.userId || 'unknown';
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `avatar-${userId}-${uniqueSuffix}${ext}`);
  },
});

const avatarFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

// Avatar routes
router.post('/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);
router.delete('/avatar', userController.removeAvatar);

// Password change
router.put('/password', userController.changePassword);

export default router;
