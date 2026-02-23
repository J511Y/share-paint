import { describe, expect, it, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  resolveApiActor: vi.fn(),
  consumeRateLimit: vi.fn(),
  resolveWriteClient: vi.fn(),
}));

vi.mock('@/lib/api-handler', () => ({
  apiHandler:
    (handler: (ctx: { req: Request; requestId: string }) => Promise<Response>) =>
    async (req: Request) =>
      handler({ req, requestId: 'req-test-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mocks.createClient,
}));

vi.mock('@/lib/api-actor', () => ({
  resolveApiActor: mocks.resolveApiActor,
}));

vi.mock('@/lib/security/action-rate-limit', () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock('@/lib/supabase/write-client', () => ({
  resolveWriteClient: mocks.resolveWriteClient,
}));

vi.mock('@/lib/logger', () => ({
  devLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    request: vi.fn(),
  },
}));

import { POST } from './route';

type BattleInsertResult = {
  data: Record<string, unknown> | null;
  error: { code?: string; message?: string; details?: string; hint?: string } | null;
};

type JoinInsertResult = {
  error: { code?: string; message?: string; details?: string; hint?: string } | null;
};

type RollbackResult = {
  error: { code?: string; message?: string; details?: string; hint?: string } | null;
};

function createWriteClient(opts: {
  battleInsertResult: BattleInsertResult;
  joinInsertResult: JoinInsertResult;
  rollbackResult?: RollbackResult;
}) {
  const battleInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(opts.battleInsertResult),
    })),
  }));

  const battleDeleteEq = vi.fn().mockResolvedValue(opts.rollbackResult ?? { error: null });
  const battleDelete = vi.fn(() => ({
    eq: battleDeleteEq,
  }));

  const participantInsert = vi.fn().mockResolvedValue(opts.joinInsertResult);

  const from = vi.fn((table: string) => {
    if (table === 'battles') {
      return {
        insert: battleInsert,
        delete: battleDelete,
      };
    }

    if (table === 'battle_participants') {
      return {
        insert: participantInsert,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    spies: {
      battleInsert,
      battleDeleteEq,
      participantInsert,
    },
  };
}

const basePayload = {
  title: '테스트 대결방',
  time_limit: 300,
  max_participants: 8,
  is_private: false,
  topic: '고양이',
};

const guestActor = {
  kind: 'guest' as const,
  actorId: 'guest:test-actor',
  userId: null,
  guestId: 'guest-1234',
  displayName: '게스트 1234',
};

describe('POST /api/battle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
    mocks.resolveApiActor.mockResolvedValue(guestActor);
    mocks.consumeRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it('creates a battle and host participant successfully', async () => {
    const battleInsertResult = {
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        host_id: null,
        host_guest_id: 'guest-1234',
        host_guest_name: '게스트 1234',
        title: '테스트 대결방',
        topic: '고양이',
        time_limit: 300,
        max_participants: 8,
        status: 'waiting',
        is_private: false,
        password: null,
        password_hash: null,
        created_at: new Date().toISOString(),
        started_at: null,
        ended_at: null,
      },
      error: null,
    } satisfies BattleInsertResult;

    const writeClient = createWriteClient({
      battleInsertResult,
      joinInsertResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request('http://localhost/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe('550e8400-e29b-41d4-a716-446655440000');

    expect(writeClient.spies.participantInsert).toHaveBeenCalledTimes(1);
    expect(writeClient.spies.participantInsert.mock.calls[0]?.[0]).toMatchObject({
      battle_id: '550e8400-e29b-41d4-a716-446655440000',
      guest_id: 'guest-1234',
      guest_name: '게스트 1234',
    });
  });

  it('returns FORBIDDEN when battle insert is blocked by RLS', async () => {
    const writeClient = createWriteClient({
      battleInsertResult: {
        data: null,
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "battles"',
        },
      },
      joinInsertResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request('http://localhost/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe('FORBIDDEN');
    expect(body.message).toBe('대결방 생성 권한이 없습니다.');
  });

  it('rolls back created battle when host participant insert fails', async () => {
    const writeClient = createWriteClient({
      battleInsertResult: {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          host_id: null,
          host_guest_id: 'guest-1234',
          host_guest_name: '게스트 1234',
          title: '테스트 대결방',
          topic: '고양이',
          time_limit: 300,
          max_participants: 8,
          status: 'waiting',
          is_private: false,
          password: null,
          password_hash: null,
          created_at: new Date().toISOString(),
          started_at: null,
          ended_at: null,
        },
        error: null,
      },
      joinInsertResult: {
        error: {
          code: '23503',
          message: 'insert or update on table "battle_participants" violates foreign key constraint',
        },
      },
      rollbackResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request('http://localhost/api/battle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    const response = await POST(req as never);

    expect(writeClient.spies.battleDeleteEq).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.details.rollbackAttempted).toBe(true);
    expect(body.details.rollbackSucceeded).toBe(true);
  });
});
