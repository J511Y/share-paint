import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAckWindow,
  isAckTimedOut,
  registerIdempotencyKey,
  resolveAckTimeoutMs,
} from '../src/ackPolicy.js';

test('resolveAckTimeoutMs clamps policy range and uses default value', () => {
  assert.equal(resolveAckTimeoutMs(undefined), 5_000);
  assert.equal(resolveAckTimeoutMs(100), 500);
  assert.equal(resolveAckTimeoutMs(45_000), 30_000);
  assert.equal(resolveAckTimeoutMs(3_000), 3_000);
});

test('resolveAckTimeoutMs validates positive integer inputs', () => {
  assert.throws(() => resolveAckTimeoutMs(0), /timeoutMs must be a positive integer/);
  assert.throws(() => resolveAckTimeoutMs(12.5), /timeoutMs must be a positive integer/);
  assert.throws(
    () => resolveAckTimeoutMs(undefined, { minTimeoutMs: 4_000, maxTimeoutMs: 3_000 }),
    /minTimeoutMs must be less than or equal to maxTimeoutMs/,
  );
});

test('createAckWindow builds deadline and grace expiration window', () => {
  const window = createAckWindow({ sentAtMs: 1_000, timeoutMs: 2_000, graceMs: 300 }, 1_100);

  assert.deepEqual(window, {
    startAtMs: 1_000,
    timeoutMs: 2_000,
    deadlineAtMs: 3_000,
    expireAtMs: 3_300,
  });
});

test('isAckTimedOut evaluates deadline boundary correctly', () => {
  const window = createAckWindow({ sentAtMs: 1_000, timeoutMs: 2_000 }, 1_000);

  assert.equal(isAckTimedOut(window, 2_999), false);
  assert.equal(isAckTimedOut(window, 3_000), true);
  assert.equal(isAckTimedOut(window, 3_001), true);
});

test('registerIdempotencyKey accepts first event and blocks duplicate key in ttl window', () => {
  const store = new Map();

  const first = registerIdempotencyKey(store, 'Event-001', { nowMs: 1_000, ttlMs: 5_000 });
  const duplicate = registerIdempotencyKey(store, ' event-001 ', { nowMs: 1_500, ttlMs: 5_000 });

  assert.deepEqual(first, {
    accepted: true,
    duplicate: false,
    expiresInMs: 5_000,
  });

  assert.deepEqual(duplicate, {
    accepted: false,
    duplicate: true,
    expiresInMs: 4_500,
  });
});

test('registerIdempotencyKey accepts key again after ttl expiry', () => {
  const store = new Map();

  registerIdempotencyKey(store, 'event-001', { nowMs: 1_000, ttlMs: 2_000 });
  const result = registerIdempotencyKey(store, 'event-001', { nowMs: 3_001, ttlMs: 2_000 });

  assert.deepEqual(result, {
    accepted: true,
    duplicate: false,
    expiresInMs: 2_000,
  });
});
