import { describe, expect, it } from 'vitest';

import { normalizeBattleStatePayload } from './recovery';

describe('normalizeBattleStatePayload', () => {
  it('normalizes valid battle state payload', () => {
    const payload = normalizeBattleStatePayload({
      status: 'in_progress',
      timeLeft: 42,
      participants: [
        {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: 'https://example.com/a.png',
          isHost: true,
          isReady: true,
          canvasData: 'data:image/png;base64,abc',
        },
      ],
    });

    expect(payload).toEqual({
      status: 'in_progress',
      timeLeft: 42,
      participants: [
        {
          id: 'user-1',
          username: 'alice',
          displayName: 'Alice',
          avatarUrl: 'https://example.com/a.png',
          isHost: true,
          isReady: true,
          canvasData: 'data:image/png;base64,abc',
        },
      ],
    });
  });

  it('falls back safely for malformed payload', () => {
    const payload = normalizeBattleStatePayload({
      status: 'unexpected',
      timeLeft: -99,
      participants: [
        {
          id: 123,
          username: 'invalid-id',
        },
        {
          id: 'user-2',
          username: 'bob',
          isReady: 'yes',
        },
      ],
    });

    expect(payload).toEqual({
      status: 'waiting',
      timeLeft: 0,
      participants: [
        {
          id: 'user-2',
          username: 'bob',
          displayName: null,
          avatarUrl: null,
          isHost: false,
          isReady: true,
        },
      ],
    });
  });
});
