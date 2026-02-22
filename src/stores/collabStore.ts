import { create } from 'zustand';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'recovering'
  | 'degraded'
  | 'disconnected';

export interface PendingCanvasOp {
  battleId: string;
  opId: string;
  ackId: string;
  seq: number;
  imageData: string;
  createdAt: number;
  retries: number;
}

interface CollabState {
  battleId: string | null;
  sessionId: string | null;
  localUserId: string | null;

  connectionStatus: ConnectionStatus;
  reconnectAttempt: number;
  lastDisconnectAt: number | null;

  nextClientSeq: number;
  lastServerAckSeq: number;
  lastServerSeq: number;

  pendingOps: PendingCanvasOp[];
  lastAppliedSeqByUser: Record<string, number>;

  isRecoveryRequired: boolean;
  lastSnapshotVersion: number;
  recoveryError: string | null;
}

interface CollabActions {
  setBattleContext: (battleId: string, userId: string) => void;
  setSessionId: (sessionId: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  markDisconnected: () => void;
  incrementReconnectAttempt: () => void;
  clearReconnectAttempt: () => void;

  allocateSeq: () => number;
  enqueuePendingOp: (op: Omit<PendingCanvasOp, 'seq' | 'createdAt' | 'retries'>) => PendingCanvasOp;
  markOpAcked: (opId: string, serverSeq?: number) => void;
  markOpRetry: (opId: string) => void;
  getPendingOps: (battleId: string) => PendingCanvasOp[];

  markAppliedSeq: (userId: string, seq: number) => boolean;
  setLastServerSeq: (seq: number) => void;

  startRecovery: () => void;
  finishRecovery: (serverSeq?: number) => void;
  failRecovery: (message: string) => void;

  reset: () => void;
}

type CollabStore = CollabState & CollabActions;

const initialState: CollabState = {
  battleId: null,
  sessionId: null,
  localUserId: null,
  connectionStatus: 'disconnected',
  reconnectAttempt: 0,
  lastDisconnectAt: null,
  nextClientSeq: 1,
  lastServerAckSeq: 0,
  lastServerSeq: 0,
  pendingOps: [],
  lastAppliedSeqByUser: {},
  isRecoveryRequired: false,
  lastSnapshotVersion: 0,
  recoveryError: null,
};

export const useCollabStore = create<CollabStore>((set, get) => ({
  ...initialState,

  setBattleContext: (battleId, userId) =>
    set({
      battleId,
      localUserId: userId,
    }),

  setSessionId: (sessionId) => set({ sessionId }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  markDisconnected: () =>
    set({
      connectionStatus: 'disconnected',
      lastDisconnectAt: Date.now(),
      isRecoveryRequired: true,
    }),

  incrementReconnectAttempt: () =>
    set((state) => ({
      reconnectAttempt: state.reconnectAttempt + 1,
      connectionStatus: 'reconnecting',
    })),

  clearReconnectAttempt: () => set({ reconnectAttempt: 0 }),

  allocateSeq: () => {
    const nextSeq = get().nextClientSeq;
    set({ nextClientSeq: nextSeq + 1 });
    return nextSeq;
  },

  enqueuePendingOp: (op) => {
    const seq = get().allocateSeq();
    const pendingOp: PendingCanvasOp = {
      ...op,
      seq,
      createdAt: Date.now(),
      retries: 0,
    };

    set((state) => ({
      pendingOps: [...state.pendingOps, pendingOp],
    }));

    return pendingOp;
  },

  markOpAcked: (opId, serverSeq) =>
    set((state) => ({
      pendingOps: state.pendingOps.filter((op) => op.opId !== opId),
      lastServerAckSeq: serverSeq ? Math.max(state.lastServerAckSeq, serverSeq) : state.lastServerAckSeq,
      lastServerSeq: serverSeq ? Math.max(state.lastServerSeq, serverSeq) : state.lastServerSeq,
    })),

  markOpRetry: (opId) =>
    set((state) => ({
      pendingOps: state.pendingOps.map((op) =>
        op.opId === opId
          ? {
              ...op,
              retries: op.retries + 1,
            }
          : op
      ),
    })),

  getPendingOps: (battleId) => get().pendingOps.filter((op) => op.battleId === battleId),

  markAppliedSeq: (userId, seq) => {
    const previousSeq = get().lastAppliedSeqByUser[userId] ?? 0;
    if (seq <= previousSeq) {
      return false;
    }

    set((state) => ({
      lastAppliedSeqByUser: {
        ...state.lastAppliedSeqByUser,
        [userId]: seq,
      },
      lastServerSeq: Math.max(state.lastServerSeq, seq),
    }));

    return true;
  },

  setLastServerSeq: (seq) =>
    set((state) => ({
      lastServerSeq: Math.max(state.lastServerSeq, seq),
    })),

  startRecovery: () =>
    set({
      connectionStatus: 'recovering',
      isRecoveryRequired: true,
      recoveryError: null,
    }),

  finishRecovery: (serverSeq) =>
    set((state) => ({
      connectionStatus: 'connected',
      isRecoveryRequired: false,
      recoveryError: null,
      lastServerSeq: serverSeq ? Math.max(state.lastServerSeq, serverSeq) : state.lastServerSeq,
    })),

  failRecovery: (message) =>
    set({
      connectionStatus: 'degraded',
      recoveryError: message,
      isRecoveryRequired: true,
    }),

  reset: () => set(initialState),
}));
