// ═══════════════════════════════════════════════════════════════
// 🛡️  CLIENT-SIDE RATE LIMITER
// Prevents abuse from the browser (complements server-side limits).
// Tracks request counts per action in memory so a compromised or
// buggy UI loop can't hammer the API.
// ═══════════════════════════════════════════════════════════════

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();

/**
 * Check if an action is rate-limited.
 * @returns `true` if the request should be ALLOWED, `false` if it should be BLOCKED.
 */
export const checkRateLimit = (
  action: string,
  maxRequests: number,
  windowMs: number
): boolean => {
  const now = Date.now();
  const bucket = buckets.get(action);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(action, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false; // BLOCKED
  }

  bucket.count++;
  return true;
};

/**
 * Get remaining time (ms) until the rate limit resets for an action.
 */
export const getRateLimitResetMs = (action: string): number => {
  const bucket = buckets.get(action);
  if (!bucket) return 0;
  return Math.max(0, bucket.resetAt - Date.now());
};

// ─── Pre-configured limiters for common actions ───────────────

/** Login: max 10 attempts per 15 minutes */
export const canAttemptLogin = (): boolean =>
  checkRateLimit('login', 10, 15 * 60 * 1000);

/** Signup: max 5 attempts per 30 minutes */
export const canAttemptSignup = (): boolean =>
  checkRateLimit('signup', 5, 30 * 60 * 1000);

/** Password reset email: max 3 per 10 minutes */
export const canRequestPasswordReset = (): boolean =>
  checkRateLimit('password-reset', 3, 10 * 60 * 1000);

/** 2FA code send: max 5 per 10 minutes */
export const canSend2FACode = (): boolean =>
  checkRateLimit('2fa-send', 5, 10 * 60 * 1000);

/** Generic API call: max 60 per minute */
export const canCallAPI = (endpoint: string): boolean =>
  checkRateLimit(`api:${endpoint}`, 60, 60 * 1000);

/** Guest booking: max 10 per 30 minutes */
export const canBookAsGuest = (): boolean =>
  checkRateLimit('guest-booking', 10, 30 * 60 * 1000);
