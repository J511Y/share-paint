import type { BattleRoom, BattleUser } from '@/types/battle';

type BattleStatus = BattleRoom['status'];

const ALLOWED_STATUS: BattleStatus[] = ['waiting', 'in_progress', 'finished'];

function normalizeStatus(status: unknown): BattleStatus {
  return typeof status === 'string' && ALLOWED_STATUS.includes(status as BattleStatus)
    ? (status as BattleStatus)
    : 'waiting';
}

function normalizeTimeLeft(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function normalizeParticipant(input: unknown): BattleUser | null {
  if (!input || typeof input !== 'object') return null;

  const candidate = input as Record<string, unknown>;
  const id = typeof candidate.id === 'string' ? candidate.id : null;
  const username = typeof candidate.username === 'string' ? candidate.username : null;

  if (!id || !username) {
    return null;
  }

  return {
    id,
    username,
    displayName: typeof candidate.displayName === 'string' ? candidate.displayName : null,
    avatarUrl: typeof candidate.avatarUrl === 'string' ? candidate.avatarUrl : null,
    isHost: !!candidate.isHost,
    isReady: !!candidate.isReady,
    ...(typeof candidate.canvasData === 'string' ? { canvasData: candidate.canvasData } : {}),
  };
}

export function normalizeBattleStatePayload(payload: unknown): {
  status: BattleStatus;
  timeLeft: number;
  participants: BattleUser[];
} {
  if (!payload || typeof payload !== 'object') {
    return {
      status: 'waiting',
      timeLeft: 0,
      participants: [],
    };
  }

  const candidate = payload as Record<string, unknown>;
  const participantsInput = Array.isArray(candidate.participants) ? candidate.participants : [];

  return {
    status: normalizeStatus(candidate.status),
    timeLeft: normalizeTimeLeft(candidate.timeLeft),
    participants: participantsInput
      .map((participant) => normalizeParticipant(participant))
      .filter((participant): participant is BattleUser => participant !== null),
  };
}
