const DEFAULT_ACK_TIMEOUT_MS = 3_000;
const DEFAULT_IDEMPOTENCY_TTL_MS = 30_000;
const DEFAULT_MAX_TRACKED_KEYS = 5_000;

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

function normalizeRequestId(requestId) {
  if (typeof requestId !== 'string') return null;
  const normalized = requestId.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAckTimeoutMs(timeoutMs) {
  if (timeoutMs == null) return DEFAULT_ACK_TIMEOUT_MS;
  assertPositiveInteger(timeoutMs, 'ackTimeoutMs');
  return timeoutMs;
}

function createAckEnvelope({
  ok,
  error = null,
  requestId = null,
  duplicate = false,
  ackTimeoutMs = DEFAULT_ACK_TIMEOUT_MS,
}) {
  return {
    ok: !!ok,
    error,
    requestId: normalizeRequestId(requestId),
    duplicate: !!duplicate,
    ackTimeoutMs: normalizeAckTimeoutMs(ackTimeoutMs),
    timestamp: new Date().toISOString(),
  };
}

function createIdempotencyTracker({
  ttlMs = DEFAULT_IDEMPOTENCY_TTL_MS,
  maxEntries = DEFAULT_MAX_TRACKED_KEYS,
} = {}) {
  assertPositiveInteger(ttlMs, 'ttlMs');
  assertPositiveInteger(maxEntries, 'maxEntries');

  const store = new Map();

  function prune(nowMs = Date.now()) {
    assertNonNegativeInteger(nowMs, 'nowMs');

    for (const [key, expireAtMs] of store.entries()) {
      if (!Number.isInteger(expireAtMs) || expireAtMs <= nowMs) {
        store.delete(key);
      }
    }

    while (store.size > maxEntries) {
      const [oldestKey] = store.keys();
      store.delete(oldestKey);
    }
  }

  function checkAndMark(rawKey, nowMs = Date.now()) {
    assertNonNegativeInteger(nowMs, 'nowMs');

    const key = normalizeRequestId(rawKey);
    if (!key) {
      return {
        accepted: true,
        duplicate: false,
        key: null,
      };
    }

    prune(nowMs);

    const existingExpireAtMs = store.get(key);
    if (Number.isInteger(existingExpireAtMs) && existingExpireAtMs > nowMs) {
      return {
        accepted: false,
        duplicate: true,
        key,
        expiresInMs: existingExpireAtMs - nowMs,
      };
    }

    store.set(key, nowMs + ttlMs);

    return {
      accepted: true,
      duplicate: false,
      key,
      expiresInMs: ttlMs,
    };
  }

  return {
    checkAndMark,
    prune,
    size: () => store.size,
  };
}

module.exports = {
  DEFAULT_ACK_TIMEOUT_MS,
  DEFAULT_IDEMPOTENCY_TTL_MS,
  createAckEnvelope,
  createIdempotencyTracker,
  normalizeRequestId,
  normalizeAckTimeoutMs,
};
