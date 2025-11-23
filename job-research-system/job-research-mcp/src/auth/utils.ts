/**
 * Authentication Utilities
 *
 * Provides JWT token generation, password hashing, and validation utilities
 * for the authentication system.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-development-secret-key-min-32-characters-long';
const JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-development-refresh-secret-min-32-characters';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// ============================================================================
// JWT TOKEN INTERFACES
// ============================================================================

export interface JWTPayload {
  userId: number;
  email: string;
  subscriptionStatus: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================================================
// JWT TOKEN UTILITIES
// ============================================================================

/**
 * Generate an access token (short-lived)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Generate a refresh token (long-lived)
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiry in seconds
  const expiresIn = jwt.decode(accessToken) as any;
  const expiresInSeconds = expiresIn.exp - expiresIn.iat;

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Decode a token without verifying (for debugging)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

// ============================================================================
// RESET TOKEN UTILITIES
// ============================================================================

/**
 * Generate a random reset token (UUID-like)
 */
export function generateResetToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Calculate reset token expiry (1 hour from now)
 */
export function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
}

/**
 * Check if a reset token has expired
 */
export function isResetTokenExpired(expiryDate: string | Date): boolean {
  return new Date(expiryDate) < new Date();
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  try {
    passwordSchema.parse(password);
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map((err) => err.message),
      };
    }
    return { valid: false, errors: ['Invalid password'] };
  }
}

// ============================================================================
// USER PAYLOAD HELPERS
// ============================================================================

/**
 * Create JWT payload from user data
 */
export function createJWTPayload(user: {
  id: number;
  email: string;
  subscription_status: string;
}): JWTPayload {
  return {
    userId: user.id,
    email: user.email,
    subscriptionStatus: user.subscription_status,
  };
}

// ============================================================================
// RATE LIMITING HELPERS
// ============================================================================

/**
 * Check if account should be locked due to failed login attempts
 */
export function shouldLockAccount(failedAttempts: number): boolean {
  return failedAttempts >= 5;
}

/**
 * Calculate account lockout duration (15 minutes)
 */
export function getAccountLockoutExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);
  return expiry;
}

/**
 * Check if account is still locked
 */
export function isAccountLocked(lockoutExpiry: string | Date | null): boolean {
  if (!lockoutExpiry) return false;
  return new Date(lockoutExpiry) > new Date();
}
