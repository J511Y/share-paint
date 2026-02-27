import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock, resolveApiActorMock, consumeRateLimitMock, consumeDuplicateContentGuardMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  resolveApiActorMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
  consumeDuplicateContentGuardMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/api-actor', () => ({
  resolveApiActor: resolveApiActorMock,
}));

vi.mock('@/lib/security/action-rate-limit', () => ({
  consumeRateLimit: consumeRateLimitMock,
  consumeDuplicateContentGuard: consumeDuplicateContentGuardMock,
}));

import { GET, POST } from './route';

function createPaintingsSupabaseMock() {
  const query = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'paintings') throw new Error(`Unexpected table: ${table}`);
      return query;
    }),
  };
}

describe('/api/paintings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimitMock.mockReturnValue({ allowed: true, retryAfterMs: 0 });
    consumeDuplicateContentGuardMock.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it('GET returns BAD_REQUEST when userId is invalid', async () => {
    createClientMock.mockResolvedValue(createPaintingsSupabaseMock());

    const req = new NextRequest('http://localhost:3000/api/paintings?userId=invalid');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('POST returns BAD_REQUEST when actor is missing', async () => {
    createClientMock.mockResolvedValue(createPaintingsSupabaseMock());
    resolveApiActorMock.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/paintings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        image_url: 'https://example.com/a.png',
        topic: 'test',
        time_limit: 60,
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', message: 'Guest identity is required.' });
  });

  it('POST returns VALIDATION_ERROR for invalid body', async () => {
    createClientMock.mockResolvedValue(createPaintingsSupabaseMock());
    resolveApiActorMock.mockResolvedValue({ actorId: 'guest-1', guestId: 'guest-1', userId: null, displayName: '게스트' });

    const req = new NextRequest('http://localhost:3000/api/paintings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image_url: 'not-url', topic: '', time_limit: -1 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
