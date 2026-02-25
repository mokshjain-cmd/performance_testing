import { Request, Response, NextFunction } from 'express';
import User, { IUser } from '../models/Users';
import { authService } from '../services/auth.service';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      userRole?: 'tester' | 'admin';
    }
  }
}

/**
 * Middleware to authenticate requests using JWT
 * Extracts JWT from Authorization header and attaches user to request
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('\n🔐 JWT Authentication');
    
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('❌ No authorization header');
      res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
      return;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.log('❌ Invalid authorization header format');
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format. Expected: Bearer <token>'
      });
      return;
    }

    const token = parts[1];

    // Verify JWT token
    const decoded = authService.verifyToken(token);

    if (!decoded) {
      console.log('❌ Invalid or expired token');
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    console.log(`✅ Token verified for user: ${decoded.email}`);

    // Fetch full user details
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('❌ User not found');
      res.status(401).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Attach user info to request
    req.userId = decoded.userId;
    req.user = user;
    req.userRole = user.role;

    console.log(`✅ User authenticated: ${user.email} (${user.role})`);

    next();
  } catch (error) {
    console.error('❌ Error in authenticateJWT:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Middleware to verify and attach user role to request
 * Extracts userId from req.userId
 */
export const verifyUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract userId from various sources
    const userId = req.userId;
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
