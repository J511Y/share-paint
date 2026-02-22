import { beforeEach, describe, expect, it } from 'vitest';
import { useCollabStore } from '@/stores/collabStore';

describe('battle collaborative critical path (pseudo-e2e)', () => {
  beforeEach(() => {
    useCollabStore.getState().reset();
  });

  it('keeps pending ops during disconnect and flushes after ack', () => {
    const store = useCollabStore.getState();

    store.setBattleContext('battle-1', 'user-1');
    store.setConnectionStatus('connected');

    const op = store.enqueuePendingOp({
      battleId: 'battle-1',
      opId: 'op-1',
      ackId: 'ack-1',
      imageData: 'data:image/png;base64,a',
    });

    expect(op.seq).toBe(1);
    expect(useCollabStore.getState().pendingOps).toHaveLength(1);

    store.markDisconnected();
    expect(useCollabStore.getState().connectionStatus).toBe('disconnected');
    expect(useCollabStore.getState().isRecoveryRequired).toBe(true);

    store.startRecovery();
    expect(useCollabStore.getState().connectionStatus).toBe('recovering');

    store.markOpAcked('op-1', 10);
    store.finishRecovery(10);

    const finalState = useCollabStore.getState();
    expect(finalState.pendingOps).toHaveLength(0);
    expect(finalState.lastServerSeq).toBe(10);
    expect(finalState.connectionStatus).toBe('connected');
  });
});
