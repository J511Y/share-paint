import { describe, expect, it } from 'vitest';

import { attachRequestIdHeader, getRequestIdHeaderName } from './request-id';

describe('request-id observability helpers', () => {
  it('attaches x-request-id header to response', () => {
    const response = new Response('ok');
    const requestId = 'req-123';

    const updated = attachRequestIdHeader(response, requestId);

    expect(updated.headers.get('x-request-id')).toBe('req-123');
  });

  it('exports the canonical request id header name', () => {
    expect(getRequestIdHeaderName()).toBe('x-request-id');
  });
});
