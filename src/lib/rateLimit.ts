const WINDOW_MS = 60_000;
/** Bound on tracked keys so an attacker rotating IPs can't grow this
 *  unboundedly; oldest entries are swept out first once it's hit. */
const MAX_TRACKED_KEYS = 5000;

interface Bucket {
  count: number;
  resetAt: number;
}

/** Vercel Fluid Compute reuses a function instance across concurrent
 *  requests, so a plain module-level Map meaningfully throttles a single
 *  abusive client hitting one instance, even though it isn't shared across
 *  regions or cold starts. That's enough to stop a naive scraper hammering
 *  an open proxy without standing up an external store (Upstash/KV) for it. */
const buckets = new Map<string, Bucket>();

/** True if `key` has exceeded `limit` requests within the current window. */
export function isRateLimited(key: string, limit: number, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  bucket.count++;
  return bucket.count > limit;
}

/** Best-effort client identifier from the headers Vercel sets at the edge. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}
