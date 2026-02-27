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

import { GET } from './route';

function createSupabaseMock(options: { profileData?: unknown; profileError?: unknown; followersCount?: number; followingCount?: number }) {
  const profilesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: options.profileData ?? null, error: options.profileError ?? null }),
  };

  const countResultQueue = [
    { count: options.followersCount ?? 0, error: null },
    { count: options.followingCount ?? 0, error: null },
  ];

  const followsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => Promise.resolve(countResultQueue.shift() ?? { count: 0, error: null })),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') return profilesQuery;
      if (table === 'follows') return followsQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('GET /api/users/by-username/[username]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue(null);
  });

  it('returns BAD_REQUEST when username is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/users/by-username/');
    const res = await GET(req, { params: Promise.resolve({ username: '' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', message: '사용자명 형식이 유효하지 않습니다.' });
  });

  it('returns NOT_FOUND when profile does not exist', async () => {
    createClientMock.mockResolvedValue(createSupabaseMock({ profileData: null, profileError: { message: 'not found' } }));

    const req = new NextRequest('http://localhost:3000/api/users/by-username/jane');
    const res = await GET(req, { params: Promise.resolve({ username: 'jane' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ code: 'NOT_FOUND', message: '사용자 정보를 조회할 수 없습니다.' });
  });

  it('returns profile payload when profile exists', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        profileData: {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'jane',
          display_name: 'Jane',
          avatar_url: null,
          bio: null,
          created_at: '2026-02-28T00:00:00.000Z',
          updated_at: '2026-02-28T00:00:00.000Z',
        },
        followersCount: 3,
        followingCount: 2,
      })
    );

    const req = new NextRequest('http://localhost:3000/api/users/by-username/jane');
    const res = await GET(req, { params: Promise.resolve({ username: 'jane' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      username: 'jane',
      followersCount: 3,
      followingCount: 2,
      isFollowing: false,
    });
  });
});
