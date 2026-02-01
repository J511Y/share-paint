import { create } from 'zustand';
import type { BattleRoom, BattleUser, ChatMessage, BattleResult } from '@/types/battle';

interface BattleState {
  // 현재 대결방 상태
  room: BattleRoom | null;
  participants: BattleUser[];
  messages: ChatMessage[];
  battleResult: BattleResult | null;

  // 내 상태
  isHost: boolean;
  isReady: boolean;
  myCanvasData: string | null;

  // 연결 상태
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // 타이머 상태
  timeLeft: number;
}

interface BattleActions {
  // 방 관련
  setRoom: (room: BattleRoom | null) => void;
  updateRoomStatus: (status: BattleRoom['status']) => void;
  setBattleResult: (result: BattleResult | null) => void;

  // 타이머 관련
  setTimeLeft: (time: number) => void;
  decrementTime: () => void;

  // 참가자 관련
  setParticipants: (participants: BattleUser[]) => void;
  addParticipant: (participant: BattleUser) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, data: Partial<BattleUser>) => void;
  updateParticipantCanvas: (userId: string, canvasData: string) => void;

  // 내 상태 관련
  setIsHost: (isHost: boolean) => void;
  setIsReady: (isReady: boolean) => void;
  setMyCanvasData: (data: string | null) => void;

  // 채팅 관련
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;

  // 연결 상태 관련
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // 리셋
  reset: () => void;
}

type BattleStore = BattleState & BattleActions;

const initialState: BattleState = {
  room: null,
  participants: [],
  messages: [],
  isHost: false,
  isReady: false,
  myCanvasData: null,
  isConnected: false,
  isLoading: false,
  error: null,
  timeLeft: 0,
  battleResult: null,
};

export const useBattleStore = create<BattleStore>((set) => ({
  ...initialState,

  setRoom: (room) => set({ room, timeLeft: room ? room.timeLimit : 0, battleResult: null }),

  updateRoomStatus: (status) =>
    set((state) => ({
      room: state.room ? { ...state.room, status } : null,
    })),

  setBattleResult: (battleResult) => set({ battleResult }),

  setTimeLeft: (timeLeft) => set({ timeLeft }),

  decrementTime: () =>
    set((state) => ({
      timeLeft: Math.max(0, state.timeLeft - 1),
    })),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== userId),
    })),

  updateParticipant: (userId, data) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === userId ? { ...p, ...data } : p
      ),
    })),

  updateParticipantCanvas: (userId, canvasData) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === userId ? { ...p, canvasData } : p
      ),
    })),

  setIsHost: (isHost) => set({ isHost }),

  setIsReady: (isReady) => set({ isReady }),

  setMyCanvasData: (myCanvasData) => set({ myCanvasData }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  setConnected: (isConnected) => set({ isConnected }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
