import { z } from 'zod';

export const SOCKET_PROTOCOL_VERSION = 1;

const BaseEnvelopeSchema = z.object({
  v: z.literal(SOCKET_PROTOCOL_VERSION),
  event: z.string().min(1),
  battleId: z.string().uuid(),
  opId: z.string().min(1),
  ackId: z.string().min(1),
  clientTs: z.number().int().nonnegative(),
  seq: z.number().int().positive(),
});

export const CanvasUpdateEnvelopeSchema = BaseEnvelopeSchema.extend({
  event: z.literal('canvas_update'),
  payload: z.object({
    imageData: z.string().min(1),
  }),
});

export const VoteEnvelopeSchema = BaseEnvelopeSchema.extend({
  event: z.literal('vote'),
  payload: z.object({
    paintingUserId: z.string().uuid(),
  }),
});

export const BattleActionEnvelopeSchema = BaseEnvelopeSchema.extend({
  event: z.enum(['join_battle', 'leave_battle', 'start_battle']),
  payload: z.object({}).optional(),
});

export const SocketAckSchema = z.object({
  ok: z.boolean(),
  opId: z.string().optional(),
  ackId: z.string().optional(),
  seq: z.number().int().positive().optional(),
  code: z
    .enum([
      'AUTH_REQUIRED',
      'FORBIDDEN',
      'NOT_FOUND',
      'BAD_REQUEST',
      'VALIDATION_ERROR',
      'ROOM_FULL',
      'INVALID_PASSWORD',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ])
    .optional(),
  error: z.string().optional(),
  retryable: z.boolean().optional(),
});

export const ResumeBattlePayloadSchema = z.object({
  battleId: z.string().uuid(),
  lastSeq: z.number().int().nonnegative(),
  lastAckSeq: z.number().int().nonnegative().optional(),
});

export type CanvasUpdateEnvelope = z.infer<typeof CanvasUpdateEnvelopeSchema>;
export type VoteEnvelope = z.infer<typeof VoteEnvelopeSchema>;
export type BattleActionEnvelope = z.infer<typeof BattleActionEnvelopeSchema>;
export type SocketAck = z.infer<typeof SocketAckSchema>;
export type ResumeBattlePayload = z.infer<typeof ResumeBattlePayloadSchema>;

export interface BattleEventLogEntry {
  seq: number;
  type: string;
  opId?: string;
  userId?: string;
  payload: Record<string, unknown>;
  ts: number;
}
