/**
 * In-memory rate limiter using sliding window algorithm
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter(ts => ts > fiveMinutesAgo);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  limit: number;
  /** Time window in milliseconds */
  window: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check if a request is within rate limits
 * @param identifier - Unique identifier (e.g., IP address)
 * @param config - Rate limit configuration (default: 10 req/min)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, window: 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.window;

  // Get or create record
  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  // Check if limit exceeded
  if (record.timestamps.length >= config.limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + config.window;

    return {
      success: false,
      remaining: 0,
      reset: resetTime,
    };
  }

  // Add current timestamp
  record.timestamps.push(now);

  return {
    success: true,
    remaining: config.limit - record.timestamps.length,
    reset: now + config.window,
  };
}

/**
 * Extract client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check common proxy headers first
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to unknown (shouldn't happen in production)
  return 'unknown';
}
