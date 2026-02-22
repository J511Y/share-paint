import { describe, expect, it, vi } from 'vitest';
import { emitWithAck, SocketAckTimeoutError } from './emitWithAck';

function createMockSocket(handler: (event: string, payload: unknown, ack: (value: unknown) => void) => void) {
  return {
    connected: true,
    emit: vi.fn((event: string, payload: unknown, ack: (value: unknown) => void) => {
      handler(event, payload, ack);
    }),
  } as unknown as Parameters<typeof emitWithAck>[0];
}

describe('emitWithAck', () => {
  it('resolves when ack returns ok', async () => {
    const socket = createMockSocket((_event, _payload, ack) => {
      ack({ ok: true, seq: 7, opId: 'op-1' });
    });

    const ack = await emitWithAck(socket, 'canvas_update', { a: 1 });

    expect(ack.ok).toBe(true);
    expect(ack.seq).toBe(7);
  });

  it('retries when retryable error is returned', async () => {
    let attempts = 0;
    const socket = createMockSocket((_event, _payload, ack) => {
      attempts += 1;
      if (attempts === 1) {
        ack({ ok: false, code: 'RATE_LIMITED', error: 'wait', retryable: true });
        return;
      }
      ack({ ok: true, seq: 3, opId: 'op-2' });
    });

    const ack = await emitWithAck(socket, 'canvas_update', { a: 1 }, { retry: 1 });

    expect(attempts).toBe(2);
    expect(ack.ok).toBe(true);
  });

  it('throws timeout error when ack is never invoked', async () => {
    const socket = createMockSocket(() => {
      // noop
    });

    await expect(
      emitWithAck(socket, 'canvas_update', { a: 1 }, { timeoutMs: 20, retry: 0 })
    ).rejects.toBeInstanceOf(SocketAckTimeoutError);
  });
});
