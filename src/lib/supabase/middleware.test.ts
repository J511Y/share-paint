import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { updateSession } from './middleware';

function makeRequest(pathname: string) {
  return new NextRequest(`https://example.com${pathname}`);
}

describe('updateSession', () => {
  it('always fails open for guest-first access on draw route', async () => {
    const response = await updateSession(makeRequest('/draw'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('always fails open for login route', async () => {
    const response = await updateSession(makeRequest('/login?redirect=%2Fdraw'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
