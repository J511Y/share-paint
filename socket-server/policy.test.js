const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAckEnvelope,
  createIdempotencyTracker,
  normalizeRequestId,
  normalizeAckTimeoutMs,
} = require('./policy');

test('normalizeRequestId trims and drops empty values', () => {
  assert.equal(normalizeRequestId(' req-1 '), 'req-1');
  assert.equal(normalizeRequestId(''), null);
  assert.equal(normalizeRequestId('   '), null);
  assert.equal(normalizeRequestId(123), null);
});

test('normalizeAckTimeoutMs returns default and validates positive integers', () => {
  assert.equal(normalizeAckTimeoutMs(undefined), 3000);
  assert.equal(normalizeAckTimeoutMs(4500), 4500);
  assert.throws(() => normalizeAckTimeoutMs(0), /ackTimeoutMs must be a positive integer/);
  assert.throws(() => normalizeAckTimeoutMs(12.5), /ackTimeoutMs must be a positive integer/);
});

test('createAckEnvelope keeps policy metadata in ack payload', () => {
  const ack = createAckEnvelope({ ok: true, requestId: ' req-1 ', duplicate: false, ackTimeoutMs: 2500 });

  assert.equal(ack.ok, true);
  assert.equal(ack.error, null);
  assert.equal(ack.requestId, 'req-1');
  assert.equal(ack.duplicate, false);
  assert.equal(ack.ackTimeoutMs, 2500);
  assert.ok(typeof ack.timestamp === 'string');
});

test('createIdempotencyTracker rejects duplicate keys in ttl window', () => {
  const tracker = createIdempotencyTracker({ ttlMs: 5000 });

  const first = tracker.checkAndMark('req-1', 1000);
  const duplicate = tracker.checkAndMark('req-1', 1200);

  assert.deepEqual(first, {
    accepted: true,
    duplicate: false,
    key: 'req-1',
    expiresInMs: 5000,
  });

  assert.deepEqual(duplicate, {
    accepted: false,
    duplicate: true,
    key: 'req-1',
    expiresInMs: 4800,
  });
});

test('createIdempotencyTracker accepts key again after ttl expiry', () => {
  const tracker = createIdempotencyTracker({ ttlMs: 1000 });

  tracker.checkAndMark('req-1', 1000);
  const acceptedAgain = tracker.checkAndMark('req-1', 2001);

  assert.deepEqual(acceptedAgain, {
    accepted: true,
    duplicate: false,
    key: 'req-1',
    expiresInMs: 1000,
  });
});
