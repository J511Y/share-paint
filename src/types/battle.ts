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
  canvasData?: string;
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
  winner?: BattlePainting;
}

export interface BattlePainting {
  userId: string;
  username: string;
  imageUrl: string;
  votes: number;
}

export interface ResumeStatePayload {
  battleId: string;
  serverSeq: number;
  status?: BattleRoom['status'];
  timeLeft?: number;
  missedEvents: BattleSocketEvent[];
  snapshotByUser: Record<string, string | null>;
}

export type BattleSocketEvent =
  | { type: 'join'; payload: { user: BattleUser; seq?: number; opId?: string } }
  | { type: 'leave'; payload: { userId: string; seq?: number; opId?: string } }
  | { type: 'ready'; payload: { userId: string; isReady: boolean; seq?: number; opId?: string } }
  | { type: 'start'; payload: { topic: string; startedAt: string; duration: number; seq?: number; opId?: string } }
  | { type: 'timer_sync'; payload: { timeLeft: number; seq?: number } }
  | { type: 'canvas_update'; payload: { userId: string; imageData: string; seq?: number; opId?: string } }
  | { type: 'chat'; payload: ChatMessage }
  | { type: 'finish'; payload: BattleResult }
  | { type: 'vote'; payload: { voterId: string; paintingUserId: string; seq?: number; opId?: string } };

export type BattleProfile = Profile;
