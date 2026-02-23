type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

type ContentSpamResult = {
  allowed: boolean;
  retryAfterMs: number;
};

interface HitBucket {
  hits: number[];
}

interface ContentBucket {
  content: string;
  ts: number;
}

const rateBuckets = new Map<string, HitBucket>();
const contentBuckets = new Map<string, ContentBucket>();

function pruneHits(hits: number[], windowMs: number, now: number): number[] {
  const threshold = now - windowMs;
  return hits.filter((ts) => ts > threshold);
}

function normalizeContent(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300);
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { hits: [] };
  bucket.hits = pruneHits(bucket.hits, windowMs, now);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0] || now;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    };
  }

  bucket.hits.push(now);
  rateBuckets.set(key, bucket);

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}

export function consumeDuplicateContentGuard(
  key: string,
  content: string,
  windowMs: number
): ContentSpamResult {
  const now = Date.now();
  const normalized = normalizeContent(content);
  const existing = contentBuckets.get(key);

  if (existing && existing.content === normalized && now - existing.ts < windowMs) {
    return {
      allowed: false,
      retryAfterMs: windowMs - (now - existing.ts),
    };
  }

  contentBuckets.set(key, {
    content: normalized,
    ts: now,
  });

  return {
    allowed: true,
    retryAfterMs: 0,
  };
}
