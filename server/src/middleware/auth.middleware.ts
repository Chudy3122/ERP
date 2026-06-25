import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { detectDevice } from '../utils/device';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';

const DESKTOP_ONLY_MSG = 'To konto może logować się tylko z komputera.';

/** Block desktop-only accounts coming from a phone/tablet. */
async function blockedDesktopOnly(req: Request, payload: { userId: string; desktop_only?: boolean }): Promise<boolean> {
  const device = detectDevice(req.headers['user-agent']);
  if (device !== 'mobile' && device !== 'tablet') return false;
  if (payload.desktop_only === true) return true;
  // Older tokens issued before this flag existed — fall back to a quick DB check
  if (payload.desktop_only === undefined) {
    const u = await AppDataSource.getRepository(User).findOne({
      where: { id: payload.userId },
      select: ['id', 'desktop_only'],
    });
    return !!u?.desktop_only;
  }
  return false;
}

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyAccessToken(token);

    // Desktop-only accounts may not use the app from a phone/tablet
    if (await blockedDesktopOnly(req, payload)) {
      return res.status(401).json({ error: 'Unauthorized', message: DESKTOP_ONLY_MSG });
    }

    // Attach user info to request
    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
};

/**
 * Optional authentication - adds user to request if token is valid, but doesn't fail if no token
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Ignore errors for optional authentication
    next();
  }
};

// Alias for backward compatibility
export const authMiddleware = authenticate;
