import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  resolveApiActor: vi.fn(),
  consumeRateLimit: vi.fn(),
  resolveWriteClient: vi.fn(),
}));

vi.mock('@/lib/api-handler', () => ({
  apiHandler:
    (
      handler: (ctx: {
        req: Request;
        params: { id?: string };
        requestId: string;
      }) => Promise<Response>
    ) =>
    async (req: Request) => {
      const match = req.url.match(/\/api\/battle\/([^/]+)\/join/);
      const id = match?.[1];
      return handler({ req, params: { id }, requestId: 'req-test-join-1' });
    },
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

type BattleSelectResult = {
  data: {
    id: string;
    max_participants: number;
    is_private: boolean;
    password: string | null;
    password_hash: string | null;
    host_id: string | null;
    host_guest_id?: string | null;
  } | null;
  error: { code?: string; message?: string } | null;
};

type JoinInsertResult = {
  error: { code?: string; message?: string } | null;
};

function createThenableResult<T extends object>(result: T) {
  const builder = {
    eq: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    then: (onFulfilled: (value: T) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };

  return builder;
}

function createWriteClient(opts: {
  battleSelectResult: BattleSelectResult;
  existingParticipants: Array<{ id: string }>;
  participantCount: number;
  countError?: { code?: string; message?: string } | null;
  joinInsertResult: JoinInsertResult;
}) {
  const battleSingle = vi.fn().mockResolvedValue(opts.battleSelectResult);
  const battleEq = vi.fn(() => ({ single: battleSingle }));
  const battleSelect = vi.fn(() => ({ eq: battleEq }));

  const participantSelect = vi.fn((_: string, options?: { count?: 'exact'; head?: boolean }) => {
    if (options?.count === 'exact' && options?.head === true) {
      return createThenableResult({ count: opts.participantCount, error: opts.countError ?? null });
    }

    return createThenableResult({ data: opts.existingParticipants, error: null });
  });

  const participantInsert = vi.fn().mockResolvedValue(opts.joinInsertResult);

  const from = vi.fn((table: string) => {
    if (table === 'battles') {
      return {
        select: battleSelect,
      };
    }

    if (table === 'battle_participants') {
      return {
        select: participantSelect,
        insert: participantInsert,
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    from,
    spies: {
      participantInsert,
    },
  };
}

const battleId = '550e8400-e29b-41d4-a716-446655440000';

const guestActor = {
  kind: 'guest' as const,
  actorId: 'guest:guest-join-001',
  userId: null,
  guestId: 'guest-join-001',
  displayName: '게스트 0001',
};

describe('POST /api/battle/[id]/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
    mocks.resolveApiActor.mockResolvedValue(guestActor);
    mocks.consumeRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0 });
  });

  it('joins successfully when room has capacity', async () => {
    const writeClient = createWriteClient({
      battleSelectResult: {
        data: {
          id: battleId,
          max_participants: 4,
          is_private: false,
          password: null,
          password_hash: null,
          host_id: null,
          host_guest_id: 'host-guest-1',
        },
        error: null,
      },
      existingParticipants: [],
      participantCount: 2,
      joinInsertResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request(`http://localhost/api/battle/${battleId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
    expect(writeClient.spies.participantInsert).toHaveBeenCalledTimes(1);
  });

  it('returns ROOM_FULL for new participant when room is full', async () => {
    const writeClient = createWriteClient({
      battleSelectResult: {
        data: {
          id: battleId,
          max_participants: 1,
          is_private: false,
          password: null,
          password_hash: null,
          host_id: null,
          host_guest_id: 'host-guest-1',
        },
        error: null,
      },
      existingParticipants: [],
      participantCount: 1,
      joinInsertResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request(`http://localhost/api/battle/${battleId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.code).toBe('ROOM_FULL');
  });

  it('returns alreadyJoined for idempotent rejoin even when room is full', async () => {
    const writeClient = createWriteClient({
      battleSelectResult: {
        data: {
          id: battleId,
          max_participants: 1,
          is_private: false,
          password: null,
          password_hash: null,
          host_id: null,
          host_guest_id: 'guest-join-001',
        },
        error: null,
      },
      existingParticipants: [{ id: 'participant-1' }],
      participantCount: 1,
      joinInsertResult: { error: null },
    });

    mocks.resolveWriteClient.mockReturnValue(writeClient);

    const req = new Request(`http://localhost/api/battle/${battleId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(req as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, alreadyJoined: true });
    expect(writeClient.spies.participantInsert).not.toHaveBeenCalled();
  });
});
