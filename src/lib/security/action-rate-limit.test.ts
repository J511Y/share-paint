import { describe, expect, it } from 'vitest';
import {
  consumeDuplicateContentGuard,
  consumeRateLimit,
} from './action-rate-limit';

describe('action-rate-limit', () => {
  it('blocks after exceeding the configured hit count', () => {
    const key = `test-rate-${Date.now()}`;

    expect(consumeRateLimit(key, 2, 10_000).allowed).toBe(true);
    expect(consumeRateLimit(key, 2, 10_000).allowed).toBe(true);

    const third = consumeRateLimit(key, 2, 10_000);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterMs).toBeGreaterThan(0);
  });

  it('blocks duplicate comment content in guard window', () => {
    const key = `test-dup-${Date.now()}`;

    expect(consumeDuplicateContentGuard(key, 'same content', 10_000).allowed).toBe(true);

    const blocked = consumeDuplicateContentGuard(key, 'same content', 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});
