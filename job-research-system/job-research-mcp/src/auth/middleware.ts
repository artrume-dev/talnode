/**
 * Authentication Middleware
 *
 * Express middleware for protecting routes and verifying JWT tokens.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from './utils.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Middleware to authenticate requests using JWT
 *
 * Extracts the JWT token from the Authorization header, verifies it,
 * and attaches the decoded user payload to req.user
 */
export function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'No authorization header provided',
        message: 'Please include an Authorization header with a Bearer token',
      });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Invalid authorization header format',
        message: 'Authorization header must be in format: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Verify and decode the token
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error: any) {
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message || 'Invalid or expired token',
    });
  }
}

// ============================================================================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Middleware for optional authentication
 *
 * Attempts to authenticate but doesn't fail if no token is provided.
 * Useful for routes that have different behavior for authenticated vs anonymous users.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const payload = verifyAccessToken(token);
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

// ============================================================================
// PREMIUM FEATURE MIDDLEWARE
// ============================================================================

/**
 * Middleware to require premium/lifetime subscription
 *
 * Must be used after authenticateUser middleware
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this feature',
    });
    return;
  }

  if (req.user.subscriptionStatus !== 'lifetime') {
    res.status(403).json({
      error: 'Premium access required',
      message: 'This feature requires a lifetime subscription',
      upgradeUrl: '/pricing',
    });
    return;
  }

  next();
}

// ============================================================================
// ADMIN MIDDLEWARE (FUTURE)
// ============================================================================

/**
 * Middleware to require admin role
 *
 * Currently not implemented - reserved for future admin features
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this feature',
    });
    return;
  }

  // TODO: Implement admin role checking when user roles are added
  res.status(403).json({
    error: 'Admin access required',
    message: 'This feature is restricted to administrators',
  });
}

// ============================================================================
// ERROR HANDLING HELPERS
// ============================================================================

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: any): boolean {
  return (
    error.message?.includes('token') ||
    error.message?.includes('authentication') ||
    error.message?.includes('unauthorized')
  );
}

/**
 * Format authentication error response
 */
export function formatAuthError(error: any): {
  error: string;
  message: string;
  code?: string;
} {
  if (error.name === 'TokenExpiredError') {
    return {
      error: 'Token expired',
      message: 'Your session has expired. Please log in again.',
      code: 'TOKEN_EXPIRED',
    };
  }

  if (error.name === 'JsonWebTokenError') {
    return {
      error: 'Invalid token',
      message: 'The provided token is invalid. Please log in again.',
      code: 'INVALID_TOKEN',
    };
  }

  return {
    error: 'Authentication failed',
    message: error.message || 'An authentication error occurred',
  };
}
