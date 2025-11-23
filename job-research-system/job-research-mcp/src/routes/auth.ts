/**
 * Authentication Routes
 *
 * Handles user registration, login, logout, token refresh, and password reset.
 */

import { Router, Request, Response } from 'express';
import { JobDatabase } from '../db/schema.js';
import {
  hashPassword,
  comparePassword,
  generateTokenPair,
  verifyRefreshToken,
  createJWTPayload,
  generateResetToken,
  getResetTokenExpiry,
  isResetTokenExpired,
  shouldLockAccount,
  getAccountLockoutExpiry,
  isAccountLocked,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
  emailSchema,
} from '../auth/utils.js';
import { authenticateUser } from '../auth/middleware.js';

const router = Router();
const db = new JobDatabase();

// ============================================================================
// USER REGISTRATION
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);
    const { email, password, fullName } = validatedData;

    // Check if user already exists
    const existingUser = db.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email.toLowerCase()) as any;

    if (existingUser) {
      res.status(400).json({
        error: 'Email already registered',
        message: 'An account with this email already exists. Please login instead.',
      });
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = db.db
      .prepare(
        `INSERT INTO users (email, password_hash, is_active, created_at)
         VALUES (?, ?, 1, CURRENT_TIMESTAMP)`
      )
      .run(email.toLowerCase(), passwordHash);

    const userId = result.lastInsertRowid as number;

    // Create user profile
    db.db
      .prepare(
        `INSERT INTO user_profiles (user_id, full_name, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`
      )
      .run(userId, fullName);

    // Get created user
    const user = db.db
      .prepare('SELECT id, email, subscription_status FROM users WHERE id = ?')
      .get(userId) as any;

    // Generate tokens
    const tokens = generateTokenPair(createJWTPayload(user));

    // Log activity
    db.db
      .prepare(
        `INSERT INTO user_activity (user_id, activity_type, activity_data, created_at)
         VALUES (?, 'registration', ?, CURRENT_TIMESTAMP)`
      )
      .run(userId, JSON.stringify({ email: user.email }));

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
      },
      tokens,
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration. Please try again.',
    });
  }
});

// ============================================================================
// USER LOGIN
// ============================================================================

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Get user from database
    const user = db.db
      .prepare(
        `SELECT id, email, password_hash, subscription_status, is_active,
                failed_login_attempts, account_locked_until
         FROM users WHERE email = ?`
      )
      .get(email.toLowerCase()) as any;

    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
      return;
    }

    // Check if account is active
    if (!user.is_active) {
      res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.',
      });
      return;
    }

    // Check if account is locked
    if (isAccountLocked(user.account_locked_until)) {
      res.status(403).json({
        error: 'Account locked',
        message: 'Too many failed login attempts. Please try again in 15 minutes.',
        lockedUntil: user.account_locked_until,
      });
      return;
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;

      if (shouldLockAccount(failedAttempts)) {
        const lockoutExpiry = getAccountLockoutExpiry();
        db.db
          .prepare(
            `UPDATE users
             SET failed_login_attempts = ?,
                 account_locked_until = ?
             WHERE id = ?`
          )
          .run(failedAttempts, lockoutExpiry.toISOString(), user.id);

        res.status(403).json({
          error: 'Account locked',
          message: 'Too many failed login attempts. Your account has been locked for 15 minutes.',
          lockedUntil: lockoutExpiry,
        });
        return;
      } else {
        db.db
          .prepare('UPDATE users SET failed_login_attempts = ? WHERE id = ?')
          .run(failedAttempts, user.id);

        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          attemptsRemaining: 5 - failedAttempts,
        });
        return;
      }
    }

    // Reset failed attempts and update last login
    db.db
      .prepare(
        `UPDATE users
         SET failed_login_attempts = 0,
             account_locked_until = NULL,
             last_login = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(user.id);

    // Generate tokens
    const tokens = generateTokenPair(createJWTPayload(user));

    // Log activity
    db.db
      .prepare(
        `INSERT INTO user_activity (user_id, activity_type, activity_data, created_at)
         VALUES (?, 'login', ?, CURRENT_TIMESTAMP)`
      )
      .run(user.id, JSON.stringify({ email: user.email }));

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        subscriptionStatus: user.subscription_status,
      },
      tokens,
    });
  } catch (error: any) {
    console.error('Login error:', error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login. Please try again.',
    });
  }
});

// ============================================================================
// TOKEN REFRESH
// ============================================================================

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Refresh token required',
        message: 'Please provide a refresh token',
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Get user from database
    const user = db.db
      .prepare(
        'SELECT id, email, subscription_status, is_active FROM users WHERE id = ?'
      )
      .get(payload.userId) as any;

    if (!user || !user.is_active) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please log in again',
      });
      return;
    }

    // Generate new tokens
    const tokens = generateTokenPair(createJWTPayload(user));

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token refresh failed',
      message: error.message || 'Invalid or expired refresh token',
    });
  }
});

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * POST /api/auth/logout
 * Logout user (client-side token deletion, server logs activity)
 */
router.post('/logout', authenticateUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'You must be logged in to logout',
      });
      return;
    }

    // Log activity
    db.db
      .prepare(
        `INSERT INTO user_activity (user_id, activity_type, created_at)
         VALUES (?, 'logout', CURRENT_TIMESTAMP)`
      )
      .run(req.user.userId);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout',
    });
  }
});

// ============================================================================
// FORGOT PASSWORD
// ============================================================================

/**
 * POST /api/auth/forgot-password
 * Generate password reset token and send email
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email
    emailSchema.parse(email);

    // Get user
    const user = db.db
      .prepare('SELECT id, email FROM users WHERE email = ?')
      .get(email.toLowerCase()) as any;

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpiry = getResetTokenExpiry();

    // Save reset token
    db.db
      .prepare(
        `UPDATE users
         SET reset_token = ?,
             reset_token_expires = ?
         WHERE id = ?`
      )
      .run(resetToken, resetExpiry.toISOString(), user.id);

    // TODO: Send email with reset link
    // For now, log the reset token (in production, send via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:5173/reset-password?token=${resetToken}`);

    // Log activity
    db.db
      .prepare(
        `INSERT INTO user_activity (user_id, activity_type, created_at)
         VALUES (?, 'password_reset_requested', CURRENT_TIMESTAMP)`
      )
      .run(user.id);

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // TODO: Remove in production (only for development)
      resetToken: resetToken,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
      return;
    }

    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred. Please try again.',
    });
  }
});

// ============================================================================
// RESET PASSWORD
// ============================================================================

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = resetPasswordSchema.parse(req.body);
    const { token, newPassword } = validatedData;

    // Find user with reset token
    const user = db.db
      .prepare(
        `SELECT id, email, reset_token_expires
         FROM users
         WHERE reset_token = ?`
      )
      .get(token) as any;

    if (!user) {
      res.status(400).json({
        error: 'Invalid reset token',
        message: 'The password reset link is invalid',
      });
      return;
    }

    // Check if token has expired
    if (isResetTokenExpired(user.reset_token_expires)) {
      res.status(400).json({
        error: 'Reset token expired',
        message: 'The password reset link has expired. Please request a new one.',
      });
      return;
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    db.db
      .prepare(
        `UPDATE users
         SET password_hash = ?,
             reset_token = NULL,
             reset_token_expires = NULL,
             failed_login_attempts = 0,
             account_locked_until = NULL
         WHERE id = ?`
      )
      .run(passwordHash, user.id);

    // Log activity
    db.db
      .prepare(
        `INSERT INTO user_activity (user_id, activity_type, created_at)
         VALUES (?, 'password_reset_completed', CURRENT_TIMESTAMP)`
      )
      .run(user.id);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation failed',
        message: 'Please check your input and try again',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: 'Password reset failed',
      message: 'An error occurred. Please try again.',
    });
  }
});

// ============================================================================
// GET CURRENT USER
// ============================================================================

/**
 * GET /api/auth/me
 * Get current authenticated user info
 */
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Not authenticated',
        message: 'Please log in',
      });
      return;
    }

    // Get user details
    const user = db.db
      .prepare(
        `SELECT u.id, u.email, u.subscription_status, u.payment_status,
                u.created_at, u.last_login,
                p.full_name, p.headline, p.current_position
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = ?`
      )
      .get(req.user.userId) as any;

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists',
      });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        headline: user.headline,
        currentPosition: user.current_position,
        subscriptionStatus: user.subscription_status,
        paymentStatus: user.payment_status,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred',
    });
  }
});

export default router;
