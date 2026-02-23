import { describe, expect, it } from 'vitest';
import { CanvasUpdateEnvelopeSchema, SocketAckSchema } from './battle-events';

describe('battle socket contracts', () => {
  it('validates canvas update envelope', () => {
    const parsed = CanvasUpdateEnvelopeSchema.safeParse({
      v: 1,
      event: 'canvas_update',
      battleId: '550e8400-e29b-41d4-a716-446655440000',
      opId: 'op-1',
      ackId: 'ack-1',
      seq: 2,
      clientTs: Date.now(),
      payload: {
        imageData: 'data:image/png;base64,abc',
      },
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid ack payload', () => {
    const parsed = SocketAckSchema.safeParse({
      ok: false,
      code: 'UNKNOWN_ERROR',
    });

    expect(parsed.success).toBe(false);
  });
});
