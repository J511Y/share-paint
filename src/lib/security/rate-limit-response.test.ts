import { describe, expect, it } from 'vitest';

import { rateLimitJson } from './rate-limit-response';

describe('rateLimitJson', () => {
  it('returns 429 with Retry-After header and retryAfterMs payload', async () => {
    const response = rateLimitJson('too fast', 1500);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('2');

    const body = await response.json();
    expect(body).toEqual({ error: 'too fast', retryAfterMs: 1500 });
  });
});
