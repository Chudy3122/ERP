import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model';

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
export const requireAdminOrTeamLeader = requireRole([UserRole.ADMIN, UserRole.TEAM_LEADER]);

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
