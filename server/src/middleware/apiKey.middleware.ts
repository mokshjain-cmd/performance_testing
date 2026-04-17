import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware to validate API key for server-to-server communication
 * Uses constant-time comparison to prevent timing attacks
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.ENGAGEMENT_API_SECRET;

  // Check if API key is configured
  if (!validApiKey) {
    console.error('⚠️  ENGAGEMENT_API_SECRET is not configured in environment variables');
    return res.status(500).json({
      success: false,
      message: 'API key validation is not properly configured'
    });
    
  }

  // Check if API key is provided
  if (!apiKey) {
    console.warn('🔒 Upload attempt without API key');
    return res.status(401).json({
      success: false,
      message: 'API key is required. Please provide X-API-Key header.'
    });
  }

  // Constant-time comparison to prevent timing attacks
  const isValid = constantTimeCompare(apiKey, validApiKey);

  if (!isValid) {
    console.warn('🔒 Upload attempt with invalid API key');
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  // API key is valid, proceed to next middleware
  return next();
};

/**
 * Constant-time string comparison to prevent timing attacks
 * Returns true if strings are equal, false otherwise
 */
function constantTimeCompare(a: string, b: string): boolean {
  try {
    // Use Node.js built-in constant-time comparison
    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  } catch (error) {
    // If lengths don't match, timingSafeEqual throws an error
    // This is fine - they're not equal
    return false;
  }
}
