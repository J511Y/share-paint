import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const createClientMock = vi.fn();
const createAdminClientMock = vi.fn();
const resolveApiActorMock = vi.fn();
const consumeRateLimitMock = vi.fn();

const loggerMock = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  request: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: createClientMock,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/api-actor', () => ({
  resolveApiActor: resolveApiActorMock,
}));

vi.mock('@/lib/security/action-rate-limit', () => ({
  consumeRateLimit: consumeRateLimitMock,
}));

vi.mock('@/lib/logger', () => ({
  devLogger: loggerMock,
}));

function buildBattleInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));

  return { insert, select, single };
}

function buildParticipantsInsertChain(result: { error: unknown }) {
  const insert = vi.fn().mockResolvedValue(result);
  return { insert };
}

describe('POST /api/battle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimitMock.mockReturnValue({ allowed: true });
  });

  it('uses admin client for guest actor writes so guest battle creation succeeds', async () => {
    const battleRow = {
      id: '11111111-1111-4111-8111-111111111111',
      host_id: null,
      host_guest_id: 'guest-abc12345',
      host_guest_name: 'guest',
      title: '게스트 배틀',
      topic: null,
      time_limit: 300,
      max_participants: 8,
      status: 'waiting',
      is_private: false,
      password: null,
      password_hash: null,
      created_at: new Date().toISOString(),
      started_at: null,
      ended_at: null,
    };

    const anonBattles = buildBattleInsertChain({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy for table "battles"' },
    });
    const anonParticipants = buildParticipantsInsertChain({ error: null });

    const anonClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'battles') return { insert: anonBattles.insert };
        if (table === 'battle_participants') return { insert: anonParticipants.insert };
        return { insert: vi.fn() };
      }),
    };

    const adminBattles = buildBattleInsertChain({ data: battleRow, error: null });
    const adminParticipants = buildParticipantsInsertChain({ error: null });

    const adminClient = {
      from: vi.fn((table: string) => {
        if (table === 'battles') return { insert: adminBattles.insert, delete: vi.fn(() => ({ eq: vi.fn() })) };
        if (table === 'battle_participants') return { insert: adminParticipants.insert };
        return { insert: vi.fn() };
      }),
    };

    createClientMock.mockResolvedValue(anonClient);
    createAdminClientMock.mockReturnValue(adminClient);

    resolveApiActorMock.mockResolvedValue({
      kind: 'guest',
      actorId: 'guest:guest-abc12345',
      userId: null,
      guestId: 'guest-abc12345',
      displayName: 'guest',
    });

    const { POST } = await import('./route');

    const request = new NextRequest('http://localhost:3000/api/battle', {
      method: 'POST',
      body: JSON.stringify({
        title: '게스트 배틀',
        time_limit: 300,
        max_participants: 8,
        is_private: false,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(battleRow.id);
    expect(createAdminClientMock).toHaveBeenCalledTimes(1);
    expect(adminBattles.insert).toHaveBeenCalledTimes(1);
    expect(adminParticipants.insert).toHaveBeenCalledTimes(1);
    expect(anonBattles.insert).not.toHaveBeenCalled();
  });
});
