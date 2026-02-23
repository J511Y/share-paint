import { useCallback } from 'react';
import { emitWithAck } from '@/lib/socket/emitWithAck';
import { getSocket } from '@/lib/socket/client';
import { useCollabStore } from '@/stores/collabStore';
import { useBattleStore } from '@/stores/battleStore';

function createClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

interface UseCollaborativeCanvasOptions {
  battleId: string;
  userId: string | null | undefined;
}

export function useCollaborativeCanvas({ battleId, userId }: UseCollaborativeCanvasOptions) {
  const setError = useBattleStore((state) => state.setError);

  const setBattleContext = useCollabStore((state) => state.setBattleContext);
  const enqueuePendingOp = useCollabStore((state) => state.enqueuePendingOp);
  const markOpAcked = useCollabStore((state) => state.markOpAcked);
  const markOpRetry = useCollabStore((state) => state.markOpRetry);
  const getPendingOps = useCollabStore((state) => state.getPendingOps);
  const lastServerSeq = useCollabStore((state) => state.lastServerSeq);

  const sendSnapshot = useCallback(
    async (imageData: string) => {
      if (!battleId || !userId) return;

      const socket = getSocket();
      if (!socket.connected) {
        setError('연결이 끊겨 작업이 대기열에 저장되었습니다.');
      }

      setBattleContext(battleId, userId);

      const opId = createClientId(`op-${userId}`);
      const ackId = createClientId('ack');
      const pendingOp = enqueuePendingOp({
        battleId,
        opId,
        ackId,
        imageData,
      });

      const payload = {
        v: 1,
        event: 'canvas_update',
        battleId,
        opId,
        ackId,
        seq: pendingOp.seq,
        clientTs: Date.now(),
        payload: {
          imageData,
        },
      };

      try {
        const ack = await emitWithAck(socket, 'canvas_update', payload, {
          timeoutMs: 1800,
          retry: 2,
        });

        if (ack.ok) {
          markOpAcked(opId, ack.seq);
          return;
        }

        markOpRetry(opId);
        setError(ack.error ?? ack.code ?? '캔버스 동기화에 실패했습니다.');
      } catch (error) {
        markOpRetry(opId);
        setError(error instanceof Error ? error.message : '캔버스 동기화에 실패했습니다.');
      }
    },
    [battleId, userId, setError, setBattleContext, enqueuePendingOp, markOpAcked, markOpRetry]
  );

  const flushPendingOps = useCallback(async () => {
    if (!battleId) return;
    const socket = getSocket();
    if (!socket.connected) return;

    const pendingOps = getPendingOps(battleId);
    for (const pendingOp of pendingOps) {
      const payload = {
        v: 1,
        event: 'canvas_update',
        battleId,
        opId: pendingOp.opId,
        ackId: pendingOp.ackId,
        seq: pendingOp.seq,
        clientTs: pendingOp.createdAt,
        payload: {
          imageData: pendingOp.imageData,
        },
      };

      try {
        const ack = await emitWithAck(socket, 'canvas_update', payload, {
          timeoutMs: 1800,
          retry: 1,
        });

        if (ack.ok) {
          markOpAcked(pendingOp.opId, ack.seq);
          continue;
        }

        markOpRetry(pendingOp.opId);
      } catch {
        markOpRetry(pendingOp.opId);
      }
    }
  }, [battleId, getPendingOps, markOpAcked, markOpRetry]);

  const requestResume = useCallback(async () => {
    if (!battleId) return;
    const socket = getSocket();
    if (!socket.connected) return;

    try {
      await emitWithAck(
        socket,
        'resume_battle',
        {
          battleId,
          lastSeq: lastServerSeq,
        },
        { timeoutMs: 2000, retry: 1 }
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : '상태 복구에 실패했습니다.');
    }
  }, [battleId, lastServerSeq, setError]);

  return {
    sendSnapshot,
    flushPendingOps,
    requestResume,
  };
}
