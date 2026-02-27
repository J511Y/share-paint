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

import { POST, DELETE } from './route';

function createFollowsSupabaseMock() {
  const insert = vi.fn().mockResolvedValue({ error: null });

  let deleteEqCalls = 0;
  const deleteQuery: { eq: ReturnType<typeof vi.fn> } = {
    eq: vi.fn().mockImplementation(() => {
      deleteEqCalls += 1;
      if (deleteEqCalls === 1) return deleteQuery;
      return Promise.resolve({ error: null });
    }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'follows') throw new Error(`Unexpected table: ${table}`);
      return {
        insert,
        delete: vi.fn().mockReturnValue(deleteQuery),
      };
    }),
  };
}

describe('/api/users/[id]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimitMock.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it('POST returns BAD_REQUEST for invalid user id', async () => {
    const req = new NextRequest('http://localhost:3000/api/users/invalid/follow', { method: 'POST' });
    const res = await POST(req, { params: Promise.resolve({ id: 'invalid' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('POST returns BAD_REQUEST when actor is missing', async () => {
    createClientMock.mockResolvedValue(createFollowsSupabaseMock());
    resolveApiActorMock.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/users/11111111-1111-4111-8111-111111111111/follow', {
      method: 'POST',
    });
    const res = await POST(req, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', message: 'Guest identity is required.' });
  });

  it('DELETE returns success when actor exists', async () => {
    createClientMock.mockResolvedValue(createFollowsSupabaseMock());
    resolveApiActorMock.mockResolvedValue({ actorId: 'guest-1', guestId: 'guest-1', userId: null });

    const req = new NextRequest('http://localhost:3000/api/users/11111111-1111-4111-8111-111111111111/follow', {
      method: 'DELETE',
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
  });
});
