import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import path from 'path';
import fs from 'fs';

const userRepository = AppDataSource.getRepository(User);

// Ensure avatars directory exists
const avatarsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get user profile',
    });
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { first_name, last_name, phone, department, position } = req.body;

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Update allowed fields
    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;
    if (position !== undefined) user.position = position;

    await userRepository.save(user);

    return res.status(200).json({
      message: 'Profile updated successfully',
      data: user.toJSON(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update profile',
    });
  }
};

/**
 * Upload avatar image
 * POST /api/users/avatar
 */
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No file provided',
      });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Delete old avatar if exists
    if (user.avatar_url) {
      const oldAvatarPath = user.avatar_url.replace('/uploads/avatars/', '');
      const fullPath = path.join(avatarsDir, oldAvatarPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Update avatar URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    user.avatar_url = avatarUrl;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url: avatarUrl,
      },
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to upload avatar',
    });
  }
};

/**
 * Remove avatar
 * DELETE /api/users/avatar
 */
export const removeAvatar = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Delete avatar file if exists
    if (user.avatar_url) {
      const avatarPath = user.avatar_url.replace('/uploads/avatars/', '');
      const fullPath = path.join(avatarsDir, avatarPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Clear avatar URL
    user.avatar_url = null;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Avatar removed successfully',
    });
  } catch (error) {
    console.error('Remove avatar error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to remove avatar',
    });
  }
};

/**
 * Upload cover photo
 * POST /api/users/cover
 */
export const uploadCover = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });

    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Validation Error', message: 'No file provided' });

    const user = await userRepository.findOne({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'Not Found', message: 'User not found' });

    // Delete old cover if exists
    if (user.cover_url) {
      const oldPath = user.cover_url.replace('/uploads/avatars/', '');
      const fullPath = path.join(avatarsDir, oldPath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    const coverUrl = `/uploads/avatars/${file.filename}`;
    user.cover_url = coverUrl;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Cover uploaded successfully',
      data: { cover_url: coverUrl },
    });
  } catch (error) {
    console.error('Upload cover error:', error);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to upload cover' });
  }
};

/**
 * Change password
 * PUT /api/users/password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 8 characters long',
      });
    }

    const user = await userRepository.findOne({
      where: { id: req.user.userId },
      select: ['id', 'password_hash'],
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Verify current password
    const isValid = await user.verifyPassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to change password',
    });
  }
};
