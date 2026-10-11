import type { Request, Response, NextFunction } from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

/**
 * Optional programmatic override for automated tests.
 */
let manualOtpLimitOverride: number | null = null;

/**
 * Helper to programmatically override the OTP rate limit for testing purposes.
 * Pass a positive integer to override, or null to revert to env/default.
 */
export function setOtpRateLimitForTesting(limit: number | null) {
  manualOtpLimitOverride = limit && limit > 0 ? limit : null;
}

/**
 * Centralized Rate Limiting Configuration
 * Reads from environment variables with production defaults, allowing instant testing adjustments.
 */
export const RATE_LIMIT_CONFIG = {
  // Tier 3: OTP Rate Limiting (Default: 3 requests per 10 minutes)
  otp: {
    get max(): number {
      if (manualOtpLimitOverride !== null && manualOtpLimitOverride > 0) {
        return manualOtpLimitOverride;
      }
      const parsed = parseInt(process.env.OTP_RATE_LIMIT_MAX || '', 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 3;
    },
    get windowMinutes(): number {
      const parsed = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || '', 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 10;
    },
    get windowMs(): number {
      return this.windowMinutes * 60 * 1000;
    },
  },
  // Tier 2: Auth Login Rate Limiting (Default: 5 attempts per 1 minute)
  authLogin: {
    get max(): number {
      const parsed = parseInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || '', 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 5;
    },
    get windowMs(): number {
      return 60 * 1000;
    },
  },
  // Tier 1: General API Rate Limiting (Default: 100 requests per 1 minute)
  general: {
    get max(): number {
      const parsed = parseInt(process.env.GENERAL_API_RATE_LIMIT_MAX || '', 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 100;
    },
    get windowMs(): number {
      return 60 * 1000;
    },
  },
};

/**
 * Standard structured JSON rate limit error response generator.
 * Returns HTTP 429 Too Many Requests with retryAfter seconds and friendly message.
 */
function createRateLimitHandler(customMessage: string) {
  return (_req: Request, res: Response, _next: NextFunction, options: any) => {
    // Read Retry-After header set by express-rate-limit or fallback to windowMs
    const headerVal = res.getHeader('Retry-After');
    const retryAfter = headerVal ? Number(headerVal) : Math.ceil(options.windowMs / 1000);

    return res.status(options.statusCode || 429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      error: customMessage || options.message || 'Too many requests. Please try again later.',
      retryAfter: Math.max(1, retryAfter),
    });
  };
}

/**
 * Composite key generator for OTP endpoints:
 * Uses normalized client IP + 10-digit mobile phone number.
 * Prevents SMS toll fraud from botnets or distributed IPs hitting a single phone.
 */
function generateOtpCompositeKey(req: Request): string {
  const rawIp = req.ip || req.socket.remoteAddress || 'unknown-ip';
  let ip = rawIp;
  try {
    ip = ipKeyGenerator(rawIp);
  } catch {
    ip = rawIp;
  }

  const rawPhone = String(req.body?.phone || req.query?.phone || '').trim();
  const normPhone = rawPhone.replace(/\D/g, '').slice(-10);

  return normPhone ? `${ip}_${normPhone}` : ip;
}

/**
 * Tier 1: General API Limiter
 * Window: 1 minute (60,000 ms)
 * Max: Configurable (default 100 requests per IP)
 * Excludes health checks.
 */
export const generalApiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.general.windowMs,
  limit: () => RATE_LIMIT_CONFIG.general.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many requests from this IP address. Please slow down and try again shortly.',
  skip: (req: Request) => req.path === '/api/health' || req.path === '/health',
  handler: createRateLimitHandler('Too many requests from this IP address. Please slow down and try again shortly.'),
});

/**
 * Tier 2: Auth Login Limiter
 * Window: 1 minute (60,000 ms)
 * Max: Configurable (default 5 attempts per IP)
 */
export const authLoginLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.authLogin.windowMs,
  limit: () => RATE_LIMIT_CONFIG.authLogin.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many login attempts. Please wait 1 minute before trying again.',
  handler: createRateLimitHandler('Too many login attempts. Please wait 1 minute before trying again.'),
});

/**
 * Tier 3: OTP Send & Verify Limiter
 * Window: Configurable (default 10 minutes)
 * Max: Configurable via OTP_RATE_LIMIT_MAX (default 3 requests per IP+phone)
 */
export const otpRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.otp.windowMs,
  limit: () => RATE_LIMIT_CONFIG.otp.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: generateOtpCompositeKey,
  message: 'Too many verification code requests. Please wait a few minutes before trying again.',
  handler: createRateLimitHandler('Too many verification requests for this mobile number. Please wait before requesting another OTP.'),
});
