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

export function resolveAckTimeoutMs(
  timeoutMs,
  {
    defaultTimeoutMs = 5_000,
    minTimeoutMs = 500,
    maxTimeoutMs = 30_000,
  } = {},
) {
  assertPositiveInteger(defaultTimeoutMs, 'defaultTimeoutMs');
  assertPositiveInteger(minTimeoutMs, 'minTimeoutMs');
  assertPositiveInteger(maxTimeoutMs, 'maxTimeoutMs');

  if (minTimeoutMs > maxTimeoutMs) {
    throw new RangeError('minTimeoutMs must be less than or equal to maxTimeoutMs');
  }

  if (timeoutMs == null) {
    return Math.min(Math.max(defaultTimeoutMs, minTimeoutMs), maxTimeoutMs);
  }

  assertPositiveInteger(timeoutMs, 'timeoutMs');

  return Math.min(Math.max(timeoutMs, minTimeoutMs), maxTimeoutMs);
}

export function createAckWindow(
  {
    sentAtMs,
    timeoutMs,
    graceMs = 250,
  } = {},
  nowMs = Date.now(),
) {
  assertNonNegativeInteger(nowMs, 'nowMs');
  assertNonNegativeInteger(graceMs, 'graceMs');

  const startAtMs = sentAtMs == null ? nowMs : sentAtMs;
  assertNonNegativeInteger(startAtMs, 'sentAtMs');

  const resolvedTimeoutMs = resolveAckTimeoutMs(timeoutMs);
  const deadlineAtMs = startAtMs + resolvedTimeoutMs;

  return {
    startAtMs,
    timeoutMs: resolvedTimeoutMs,
    deadlineAtMs,
    expireAtMs: deadlineAtMs + graceMs,
  };
}

export function isAckTimedOut(window, nowMs = Date.now()) {
  assertNonNegativeInteger(nowMs, 'nowMs');

  if (!window || typeof window !== 'object') {
    throw new TypeError('window must be an object');
  }

  assertNonNegativeInteger(window.deadlineAtMs, 'window.deadlineAtMs');

  return nowMs >= window.deadlineAtMs;
}

export function registerIdempotencyKey(
  store,
  key,
  {
    nowMs = Date.now(),
    ttlMs = 60_000,
  } = {},
) {
  if (!(store instanceof Map)) {
    throw new TypeError('store must be a Map instance');
  }

  if (typeof key !== 'string' || key.trim() === '') {
    throw new TypeError('key must be a non-empty string');
  }

  assertNonNegativeInteger(nowMs, 'nowMs');
  assertPositiveInteger(ttlMs, 'ttlMs');

  for (const [storedKey, expireAtMs] of store.entries()) {
    if (!Number.isInteger(expireAtMs) || expireAtMs <= nowMs) {
      store.delete(storedKey);
    }
  }

  const normalizedKey = key.trim().toLowerCase();
  const existingExpireAtMs = store.get(normalizedKey);

  if (Number.isInteger(existingExpireAtMs) && existingExpireAtMs > nowMs) {
    return {
      accepted: false,
      duplicate: true,
      expiresInMs: existingExpireAtMs - nowMs,
    };
  }

  const expireAtMs = nowMs + ttlMs;
  store.set(normalizedKey, expireAtMs);

  return {
    accepted: true,
    duplicate: false,
    expiresInMs: ttlMs,
  };
}
