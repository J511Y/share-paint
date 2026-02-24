import { describe, expect, it } from 'vitest';

import { buildApiLogFields } from './api-log-fields';

describe('buildApiLogFields', () => {
  it('builds canonical api log fields', () => {
    const fields = buildApiLogFields({
      requestId: 'req-1',
      path: '/api/topics',
      method: 'GET',
      statusCode: 200,
      durationMs: 42,
      userId: 'user-1',
    });

    expect(fields).toEqual({
      requestId: 'req-1',
      path: '/api/topics',
      method: 'GET',
      statusCode: 200,
      durationMs: 42,
      userId: 'user-1',
    });
  });

  it('normalizes missing user id as null', () => {
    const fields = buildApiLogFields({
      requestId: 'req-2',
      path: '/api/battle',
      method: 'POST',
      statusCode: 401,
      durationMs: 13,
    });

    expect(fields.userId).toBeNull();
  });
});
