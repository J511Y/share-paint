import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock, resolveApiActorMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  resolveApiActorMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/api-actor', () => ({
  resolveApiActor: resolveApiActorMock,
}));

import { GET, POST } from './route';

function createCommentsSupabaseMock() {
  const commentsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== 'comments') throw new Error(`Unexpected table: ${table}`);
      return commentsQuery;
    }),
  };
}

describe('/api/paintings/[id]/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns BAD_REQUEST when painting id is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/paintings/invalid/comments');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('POST returns BAD_REQUEST when actor is missing', async () => {
    createClientMock.mockResolvedValue(createCommentsSupabaseMock());
    resolveApiActorMock.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/paintings/11111111-1111-4111-8111-111111111111/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'hello' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', message: 'Guest identity is required.' });
  });

  it('POST returns VALIDATION_ERROR when body is invalid', async () => {
    createClientMock.mockResolvedValue(createCommentsSupabaseMock());
    resolveApiActorMock.mockResolvedValue({ actorId: 'guest-1', guestId: 'guest-1', userId: null, displayName: '게스트' });

    const req = new NextRequest('http://localhost:3000/api/paintings/11111111-1111-4111-8111-111111111111/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });
});
