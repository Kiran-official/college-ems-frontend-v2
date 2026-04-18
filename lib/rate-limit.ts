// Rate limiting utility using Map in-memory cache.
// Note: On Vercel this is reset between cold starts, but it's sufficient
// to prevent aggressive bursts within the same lambda instance.
// For multi-region strict rate limiting on Vercel, consider Vercel KV or Upstash Redis.

type RateLimitRecord = {
    count: number;
    resetAt: number;
};

const rateLimitCache = new Map<string, RateLimitRecord>();

interface RateLimitTracker {
    limit: number;
    window: number; // in milliseconds
}

export function rateLimit(identifier: string, rules: RateLimitTracker = { limit: 10, window: 60000 }): { success: boolean; limit: number; remaining: number } {
    const now = Date.now();
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
