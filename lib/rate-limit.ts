/**
 * In-Memory Rate Limiter
 *
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  PRODUCTION LIMITATION                                       ║
 * ║                                                               ║
 * ║  This rate limiter uses a process-local Map. It resets on     ║
 * ║  every cold start and does NOT share state across serverless  ║
 * ║  instances (e.g., Vercel Functions).                          ║
 * ║                                                               ║
 * ║  For cross-instance rate limiting, migrate to:                ║
 * ║  • Vercel KV  (@vercel/kv)                                   ║
 * ║  • Upstash Redis  (@upstash/ratelimit)                       ║
 * ║                                                               ║
 * ║  Despite the limitation, this still prevents aggressive       ║
 * ║  bursts within a single warm lambda/container and is better   ║
 * ║  than no rate limiting at all.                                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * Default: 10 requests per 60 seconds per identifier.
 * Recommended tighter windows for sensitive operations:
 *   - Password changes: { limit: 3, window: 60000 }
 *   - Registration:     { limit: 5, window: 60000 }
 *   - Login:            { limit: 5, window: 300000 }
 */

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

const rateLimitCache = new Map<string, RateLimitRecord>();

/** Maximum map size to prevent unbounded memory growth on long-lived instances */
const MAX_CACHE_SIZE = 10_000;

interface RateLimitTracker {
    limit: number;
    window: number; // in milliseconds
}

export function rateLimit(identifier: string, rules: RateLimitTracker = { limit: 10, window: 60000 }): { success: boolean; limit: number; remaining: number } {
    const now = Date.now();

    // Evict oldest entries if map grows too large (memory leak guard)
    if (rateLimitCache.size > MAX_CACHE_SIZE) {
        const firstKey = rateLimitCache.keys().next().value;
        if (firstKey) rateLimitCache.delete(firstKey);
    }

    const record = rateLimitCache.get(identifier);

    if (!record) {
        rateLimitCache.set(identifier, {
            count: 1,
            resetAt: now + rules.window
        });
        return { success: true, limit: rules.limit, remaining: rules.limit - 1 };
    }

    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + rules.window;
        return { success: true, limit: rules.limit, remaining: rules.limit - 1 };
    }

    if (record.count >= rules.limit) {
        return { success: false, limit: rules.limit, remaining: 0 };
    }

    record.count += 1;
    return { success: true, limit: rules.limit, remaining: rules.limit - record.count };
}
