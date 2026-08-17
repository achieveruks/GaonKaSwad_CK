import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const AUTH_SECRET = process.env.AUTH_SECRET || 'gaonkaswad-owner-auth-secret-key-2026';
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'achieveruks@gmail.com').toLowerCase().trim();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'gaonkaswaD1!';

export interface TokenPayload {
  email: string;
  role: 'owner' | 'admin';
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Creates a cryptographically signed HMAC token
 */
export function createSessionToken(email: string, role: 'owner' | 'admin' = 'owner'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  // Token valid for 7 days
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const payloadData: TokenPayload = { email: email.toLowerCase(), role, exp };
  const payload = Buffer.from(JSON.stringify(payloadData)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies a token's HMAC signature and expiration
 */
export function verifySessionToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payloadData: TokenPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    const now = Math.floor(Date.now() / 1000);
    if (payloadData.exp && payloadData.exp < now) {
      return null; // Expired
    }

    return payloadData;
  } catch {
    return null;
  }
}

/**
 * Validates owner login credentials
 */
export function validateOwnerCredentials(email: string, password: string): boolean {
  if (!email || !password) return false;
  const cleanEmail = email.toLowerCase().trim();
  
  // 1. Check configured environment owner email & password
  if (cleanEmail === OWNER_EMAIL && password === OWNER_PASSWORD) return true;
  
  // 2. Allow user email achieveruks@gmail.com with standard or demo passwords
  if (cleanEmail === 'achieveruks@gmail.com' && (password === 'gaonkaswaD1!' || password === 'admin123' || password === 'owner123')) {
    return true;
  }

  // 3. Allow standard kitchen admin aliases for testing and demo access
  if ((cleanEmail === 'admin@gaonkaswad.com' || cleanEmail === 'owner@gaonkaswad.com') && 
      (password === 'gaonkaswaD1!' || password === 'admin123' || password === 'owner123' || password === 'admin')) {
    return true;
  }

  return false;
}

/**
 * Express middleware to protect owner/admin routes
 */
export function requireOwnerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Please log in to access owner features.'
    });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifySessionToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Session invalid or expired. Please log in again.'
    });
  }

  req.user = payload;
  next();
}
