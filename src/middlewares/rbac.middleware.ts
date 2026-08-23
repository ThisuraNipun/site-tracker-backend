import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { sendError } from '../utils/response';

/**
 * Middleware to check if the user has ALL the required permissions.
 * @param requiredPermissions Array of permission names (e.g., ['create_user', 'delete_user'])
 */
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions || [];

    // Super Admin wildcard bypass
    if (userPermissions.includes('*')) {
      next();
      return;
    }

    // Check if user has ALL required permissions
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      sendError(res, 403, 'Forbidden: You do not have the required permissions to perform this action');
      return;
    }

    next();
  };
};

/**
 * Middleware to check if the user has AT LEAST ONE of the allowed permissions.
 * @param allowedPermissions Array of permission names (e.g., ['view_users', 'manage_users'])
 */
export const requireAnyPermission = (allowedPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions || [];

    // Super Admin wildcard bypass
    if (userPermissions.includes('*')) {
      next();
      return;
    }

    // Check if user has AT LEAST ONE of the allowed permissions
    const hasPermission = allowedPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      sendError(res, 403, 'Forbidden: You do not have the required permissions to perform this action');
      return;
    }

    next();
  };
};
