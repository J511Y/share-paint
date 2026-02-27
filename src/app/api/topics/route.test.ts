import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock, resolveApiActorMock, consumeRateLimitMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  resolveApiActorMock: vi.fn(),
  consumeRateLimitMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/api-actor', () => ({
  resolveApiActor: resolveApiActorMock,
}));

vi.mock('@/lib/security/action-rate-limit', () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

import { POST } from './route';

function createSupabaseInsertResult(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

describe('POST /api/topics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimitMock.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it('returns BAD_REQUEST when actor is missing', async () => {
    createClientMock.mockResolvedValue(createSupabaseInsertResult({ data: null, error: null }));
    resolveApiActorMock.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/topics', {
      method: 'POST',
      body: JSON.stringify({ content: '고양이' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', message: '게스트 식별 정보가 필요합니다.' });
  });

  it('returns VALIDATION_ERROR when payload is invalid', async () => {
    createClientMock.mockResolvedValue(createSupabaseInsertResult({ data: null, error: null }));
    resolveApiActorMock.mockResolvedValue({ actorId: 'guest-1' });

    const req = new NextRequest('http://localhost:3000/api/topics', {
      method: 'POST',
      body: JSON.stringify({ content: '' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('returns created topic when payload is valid', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseInsertResult({
        data: {
          id: '11111111-1111-4111-8111-111111111111',
          content: '고양이가 달리는 자동차',
          category: 'general',
          difficulty: 'normal',
          created_at: '2026-02-28T00:00:00.000Z',
        },
        error: null,
      })
    );
    resolveApiActorMock.mockResolvedValue({ actorId: 'guest-1' });

    const req = new NextRequest('http://localhost:3000/api/topics', {
      method: 'POST',
      body: JSON.stringify({ content: '고양이가 달리는 자동차' }),
      headers: { 'content-type': 'application/json' },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      content: '고양이가 달리는 자동차',
      category: 'general',
      difficulty: 'normal',
    });
  });
});
