type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
) {
  const now = Date.now();
  const bucket = buckets.get(key);

  // İlk istek veya süresi dolmuş pencere
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  // Limit aşıldı
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }

  // Devam
  bucket.count += 1;
  buckets.set(key, bucket);
  return {
    ok: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}
