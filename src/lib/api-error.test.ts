import { describe, expect, it } from 'vitest';
import { createApiError } from './api-error';

describe('api-error helper', () => {
  it('creates normalized error payload', () => {
    const payload = createApiError('VALIDATION_ERROR', 'invalid body', 'trace-1', {
      field: 'title',
    });

    expect(payload).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'invalid body',
      details: { field: 'title' },
      traceId: 'trace-1',
    });
  });
});
