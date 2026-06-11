import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';
import fs from 'fs';
import { cloudinary } from '../config/cloudinary';

const userRepository = AppDataSource.getRepository(User);

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
 * Get the full employee directory — available to every authenticated user.
 * GET /api/users
 */
export const getDirectory = async (_req: Request, res: Response) => {
  try {
    const users = await userRepository.find({
      select: [
        'id', 'first_name', 'last_name', 'email', 'phone',
        'department', 'position', 'employee_id', 'hire_date',
        'role', 'is_active', 'avatar_url',
      ],
      order: { first_name: 'ASC' },
    });

    return res.status(200).json({ employees: users, total: users.length });
  } catch (error) {
    console.error('Get directory error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to get employee directory',
    });
  }
};

/**
 * Get a single user's profile by id (admin / kadry / managers — read only).
 * GET /api/users/:id
 */
export const getUserProfileById = async (req: Request, res: Response) => {
  try {
    const user = await userRepository.findOne({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    return res.status(200).json({ data: user.toJSON() });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Server Error', message: 'Failed to get user profile' });
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

    // Upload to Cloudinary (overwrites previous avatar for this user)
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'erp-avatars',
      public_id: `avatar-${req.user!.userId}`,
      overwrite: true,
      transformation: [
        { width: 512, height: 512, crop: 'fill', gravity: 'face' },
        { quality: 85, fetch_format: 'auto' },
      ],
    });

    fs.unlinkSync(file.path);

    user.avatar_url = result.secure_url;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Avatar uploaded successfully',
      data: {
        avatar_url: result.secure_url,
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

    // Delete from Cloudinary if it's a Cloudinary URL
    if (user.avatar_url?.includes('cloudinary.com')) {
      await cloudinary.uploader.destroy(`erp-avatars/avatar-${req.user!.userId}`).catch(() => {});
    }

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

    // Upload cover to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'erp-covers',
      public_id: `cover-${req.user!.userId}`,
      overwrite: true,
      transformation: [
        { width: 1200, height: 400, crop: 'fill', gravity: 'center' },
        { quality: 85, fetch_format: 'auto' },
      ],
    });

    fs.unlinkSync(file.path);

    user.cover_url = result.secure_url;
    await userRepository.save(user);

    return res.status(200).json({
      message: 'Cover uploaded successfully',
      data: { cover_url: result.secure_url },
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
