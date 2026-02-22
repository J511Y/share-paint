import type { Profile } from './database';

export interface BattleRoom {
  id: string;
  title: string;
  hostId: string;
  topic: string | null;
  timeLimit: number;
  maxParticipants: number;
  status: 'waiting' | 'in_progress' | 'finished';
  participants: BattleUser[];
  createdAt: string;
  startedAt: string | null;
}

export interface BattleUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isHost: boolean;
  isReady: boolean;
  canvasData?: string; // 실시간 캔버스 미리보기
}

export interface ChatMessage {
  id: string;
  battleId: string;
  userId: string;
  username: string;
  content: string;
  type: 'message' | 'emoji' | 'system';
  timestamp: string;
}

export interface BattleResult {
  battleId: string;
  paintings: BattlePainting[];
  winner?: BattlePainting; // 투표 1위
}

export interface BattlePainting {
  userId: string;
  username: string;
  imageUrl: string;
  votes: number;
}

// WebSocket 이벤트 타입
export type BattleSocketEvent =
  | { type: 'join'; payload: { user: BattleUser } }
  | { type: 'leave'; payload: { userId: string } }
  | { type: 'ready'; payload: { userId: string; isReady: boolean } }
  | {
      type: 'battle_state';
      payload: {
        status: BattleRoom['status'];
        timeLeft: number;
        participants: BattleUser[];
      };
    }
  | { type: 'start'; payload: { topic: string; startedAt: string; duration: number } }
  | { type: 'timer_sync'; payload: { timeLeft: number } }
  | { type: 'canvas_update'; payload: { userId: string; imageData: string } }
  | { type: 'chat'; payload: ChatMessage }
  | { type: 'finish'; payload: BattleResult }
  | { type: 'vote'; payload: { voterId: string; paintingUserId: string } };
