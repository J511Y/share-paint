import type { Socket } from 'socket.io-client';
import { SocketAckSchema, type SocketAck } from './battle-events';

export class SocketAckTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocketAckTimeoutError';
  }
}

interface EmitWithAckOptions {
  timeoutMs?: number;
  retry?: number;
}

async function emitOnce(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<SocketAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new SocketAckTimeoutError(`ACK timeout for event ${event}`));
    }, timeoutMs);

    socket.emit(event, payload, (rawAck: unknown) => {
      clearTimeout(timer);
      const parsedAck = SocketAckSchema.safeParse(rawAck);
      if (!parsedAck.success) {
        reject(new Error(`Invalid ACK payload for event ${event}`));
        return;
      }

      resolve(parsedAck.data);
    });
  });
}

export async function emitWithAck(
  socket: Socket,
  event: string,
  payload: Record<string, unknown>,
  options: EmitWithAckOptions = {}
): Promise<SocketAck> {
  const timeoutMs = options.timeoutMs ?? 1500;
  const retry = options.retry ?? 2;

  if (!socket.connected) {
    throw new Error('Socket is not connected');
  }

  let attempt = 0;
  while (attempt <= retry) {
    try {
      const ack = await emitOnce(socket, event, payload, timeoutMs);
      if (ack.ok) {
        return ack;
      }

      const errorMessage = ack.error ?? ack.code ?? 'Unknown socket error';
      if (!ack.retryable || attempt === retry) {
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (attempt === retry) {
        throw error;
      }
    }

    attempt += 1;
  }

  throw new Error(`Failed to send event ${event}`);
}
