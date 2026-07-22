const buckets = new Map<string, number[]>();
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  now = Date.now(),
): boolean {
  const fresh = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (fresh.length >= limit) return false;
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}
