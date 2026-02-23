import { beforeEach, describe, expect, it } from 'vitest';
import { useCollabStore } from './collabStore';

describe('collabStore', () => {
  beforeEach(() => {
    useCollabStore.getState().reset();
  });

  it('allocates monotonically increasing client seq', () => {
    const first = useCollabStore.getState().allocateSeq();
    const second = useCollabStore.getState().allocateSeq();

    expect(first).toBe(1);
    expect(second).toBe(2);
  });

  it('enqueues ops and removes op after ack', () => {
    const op = useCollabStore.getState().enqueuePendingOp({
      battleId: 'battle-1',
      opId: 'op-1',
      ackId: 'ack-1',
      imageData: 'data:image/png;base64,a',
    });

    expect(op.seq).toBe(1);
    expect(useCollabStore.getState().pendingOps).toHaveLength(1);

    useCollabStore.getState().markOpAcked('op-1', 11);

    const state = useCollabStore.getState();
    expect(state.pendingOps).toHaveLength(0);
    expect(state.lastServerAckSeq).toBe(11);
  });

  it('deduplicates applied seq per user', () => {
    const first = useCollabStore.getState().markAppliedSeq('user-1', 3);
    const duplicate = useCollabStore.getState().markAppliedSeq('user-1', 2);
    const next = useCollabStore.getState().markAppliedSeq('user-1', 4);

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(next).toBe(true);
  });

  it('updates connection state for recovery lifecycle', () => {
    useCollabStore.getState().startRecovery();
    expect(useCollabStore.getState().connectionStatus).toBe('recovering');

    useCollabStore.getState().finishRecovery(42);

    const state = useCollabStore.getState();
    expect(state.connectionStatus).toBe('connected');
    expect(state.lastServerSeq).toBe(42);
    expect(state.isRecoveryRequired).toBe(false);
  });
});
