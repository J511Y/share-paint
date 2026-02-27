import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

import { GET } from './route';

function createTopicQueryResult(topics: unknown[] | null, error: unknown = null) {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: topics, error }),
  };
}

describe('GET /api/topics/random', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns VALIDATION_ERROR when query is invalid', async () => {
    createClientMock.mockResolvedValue(createTopicQueryResult([]));

    const req = new NextRequest('http://localhost:3000/api/topics/random?difficulty=impossible');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: '주제 조회 조건이 유효하지 않습니다.',
    });
    expect(typeof body.traceId).toBe('string');
  });

  it('returns NOT_FOUND when topics do not exist', async () => {
    createClientMock.mockResolvedValue(createTopicQueryResult([]));

    const req = new NextRequest('http://localhost:3000/api/topics/random');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({
      code: 'NOT_FOUND',
      message: '등록된 주제가 없습니다.',
    });
  });

  it('returns a topic when query succeeds', async () => {
    createClientMock.mockResolvedValue(
      createTopicQueryResult([
        {
          id: '11111111-1111-4111-8111-111111111111',
          content: '고양이가 우주복을 입고 달에서 춤추는 장면',
          category: 'general',
          difficulty: 'easy',
          created_at: '2026-02-28T00:00:00.000Z',
        },
      ])
    );

    const req = new NextRequest('http://localhost:3000/api/topics/random');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      category: 'general',
      difficulty: 'easy',
    });
  });
});
