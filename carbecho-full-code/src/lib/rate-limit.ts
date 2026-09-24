// In-memory sliding-window rate limiter, keyed by client IP. Good enough to
// blunt casual abuse/scripted hammering of unauthenticated routes; it resets
// per server instance so it isn't a substitute for a shared store like Redis
// under multi-instance deployment, but there is currently only one instance.
const buckets = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function isRateLimited(request: Request, key: string, limit: number, windowMs: number): boolean {
  const bucketKey = `${key}:${clientIp(request)}`;
  const now = Date.now();
  const hits = (buckets.get(bucketKey) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(bucketKey, hits);
    return true;
  }

  hits.push(now);
  buckets.set(bucketKey, hits);
  return false;
}
