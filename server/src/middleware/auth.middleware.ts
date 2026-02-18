import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/Users';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userRole?: 'tester' | 'admin';
    }
  }
}

/**
 * Middleware to verify and attach user role to request
 * Extracts userId from req.body, req.params, or req.query
 */
export const verifyUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract userId from various sources
    const userId = req.body.userId || req.params.userId || req.query.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    // Fetch user from database
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Attach user info to request
    req.user = user;
    req.userRole = user.role;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying user role',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware factory to restrict access to specific roles
 * Usage: requireRole('admin') or requireRole(['admin', 'tester'])
 */
export const requireRole = (allowedRoles: 'admin' | 'tester' | Array<'admin' | 'tester'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({
        success: false,
        message: 'User role not verified. Please use verifyUserRole middleware first.'
      });
      return;
    }

    // Convert single role to array for easier checking
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.userRole}`
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user is tester
 */
export const requireTester = requireRole('tester');
