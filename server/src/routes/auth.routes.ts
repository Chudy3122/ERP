import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public registration is disabled — accounts are created by an administrator only.
router.post('/register', (_req, res) => {
  res.status(403).json({
    error: 'Registration Disabled',
    message: 'Rejestracja jest wyłączona. Konta zakłada administrator.',
  });
});
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
