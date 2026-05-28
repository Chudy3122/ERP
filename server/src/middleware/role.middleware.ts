import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.model';

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware to check if user is admin or team leader
 */
export const requireAdminOrTeamLeader = requireRole([UserRole.ADMIN, UserRole.KIEROWNIK]);

/**
 * Middleware to check if user can access resource (either owns it or is admin)
 */
export const requireResourceOwnerOrAdmin = (resourceUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const resourceUserId = req.params[resourceUserIdParam] || req.body[resourceUserIdParam];

    // Admin can access any resource
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // User can only access their own resources
    if (req.user.userId !== resourceUserId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
    }

    next();
  };
};

// Alias for backward compatibility
export const roleMiddleware = requireRole;

/**
 * Allows ADMIN unconditionally.
 * Allows KIEROWNIK only if the target user (req.params.id) is in the same department.
 * Rejects everyone else.
 */
export const requireAdminOrSameDeptManager = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (req.user.role === UserRole.ADMIN) return next();

    if (req.user.role !== UserRole.KIEROWNIK) {
      return res.status(403).json({ error: 'Forbidden', message: 'Brak uprawnień' });
    }

    const targetUserId = req.params.id;
    if (!targetUserId) return res.status(400).json({ error: 'Bad Request', message: 'Brak identyfikatora użytkownika' });

    try {
      const userRepo = AppDataSource.getRepository(User);
      const [requester, target] = await Promise.all([
        userRepo.findOne({ where: { id: req.user.userId }, select: ['id', 'department_id'] }),
        userRepo.findOne({ where: { id: targetUserId }, select: ['id', 'department_id'] }),
      ]);

      if (!requester?.department_id) {
        return res.status(403).json({ error: 'Forbidden', message: 'Kierownik nie jest przypisany do żadnego działu' });
      }
      if (!target || requester.department_id !== target.department_id) {
        return res.status(403).json({ error: 'Forbidden', message: 'Możesz edytować tylko pracowników ze swojego działu' });
      }

      return next();
    } catch {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};
