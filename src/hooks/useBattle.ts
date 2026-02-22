import { useEffect, useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useBattleStore } from '@/stores/battleStore';
import { useCollabStore } from '@/stores/collabStore';
import { connectSocket } from '@/lib/socket/client';
import { emitWithAck } from '@/lib/socket/emitWithAck';
import type { BattleSocketEvent, BattleUser, BattleRoom, ResumeStatePayload } from '@/types/battle';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase/client';
import { useConnectionState } from './useConnectionState';
import { useCollaborativeCanvas } from './useCollaborativeCanvas';
import { SOCKET_PROTOCOL_VERSION } from '@/lib/socket/battle-events';

interface BattleDetailParticipant {
  user_id: string;
  profile?: {
    username?: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
}

interface BattleDetailResponse {
  id: string;
  title: string;
  topic: string | null;
  host_id: string;
  status: 'waiting' | 'in_progress' | 'finished';
  time_limit: number;
  max_participants: number;
  created_at: string;
  started_at: string | null;
  participants?: BattleDetailParticipant[];
}

function toBattleUser(participant: BattleDetailParticipant, hostId: string): BattleUser {
  const username = participant.profile?.username || `user-${participant.user_id.slice(0, 6)}`;

  return {
    id: participant.user_id,
    username,
    displayName: participant.profile?.display_name ?? null,
    avatarUrl: participant.profile?.avatar_url ?? null,
    isHost: participant.user_id === hostId,
    isReady: false,
  };
}

function toBattleRoom(payload: BattleDetailResponse): BattleRoom {
  return {
    id: payload.id,
    title: payload.title,
    hostId: payload.host_id,
    topic: payload.topic,
    timeLimit: payload.time_limit,
    maxParticipants: payload.max_participants,
    status: payload.status,
    participants: (payload.participants ?? []).map((participant) => toBattleUser(participant, payload.host_id)),
    createdAt: payload.created_at,
    startedAt: payload.started_at,
  };
}

function createOpId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useBattle(battleId: string) {
  const { user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useConnectionState(socket);

  const {
    room,
    setRoom,
    updateRoomStatus,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    updateParticipantCanvas,
    addMessage,
    setConnected,
    setError,
    reset,
    setIsReady,
    timeLeft,
    setTimeLeft,
    decrementTime,
    setBattleResult,
  } = useBattleStore();

  const setBattleContext = useCollabStore((state) => state.setBattleContext);
  const setConnectionStatus = useCollabStore((state) => state.setConnectionStatus);
  const markAppliedSeq = useCollabStore((state) => state.markAppliedSeq);
  const setLastServerSeq = useCollabStore((state) => state.setLastServerSeq);
  const startRecovery = useCollabStore((state) => state.startRecovery);
  const finishRecovery = useCollabStore((state) => state.finishRecovery);
  const failRecovery = useCollabStore((state) => state.failRecovery);
  const lastServerSeq = useCollabStore((state) => state.lastServerSeq);

  const { sendSnapshot, flushPendingOps, requestResume } = useCollaborativeCanvas({
    battleId,
    userId: user?.id,
  });

  // 타이머 로직
  useEffect(() => {
    if (room?.status === 'in_progress' && timeLeft > 0) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          decrementTime();
        }, 1000);
      }
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [room?.status, timeLeft, decrementTime]);

  // 초기 room/participants 로드
  useEffect(() => {
    if (!battleId) return;

    let isCancelled = false;

    const loadRoom = async () => {
      try {
        const response = await fetch(`/api/battle/${battleId}`);
        if (!response.ok) {
          throw new Error('대결방 정보를 불러오지 못했습니다.');
        }

        const payload = (await response.json()) as BattleDetailResponse;
        if (isCancelled) return;

        const battleRoom = toBattleRoom(payload);
        setRoom(battleRoom);
        setParticipants(battleRoom.participants);
      } catch (error) {
        if (isCancelled) return;
        setError(error instanceof Error ? error.message : '대결방 정보를 불러오지 못했습니다.');
      }
    };

    loadRoom();

    return () => {
      isCancelled = true;
    };
  }, [battleId, setRoom, setParticipants, setError]);

  // 소켓 이벤트 핸들러 설정
  useEffect(() => {
    if (!battleId || !user) return;

    let activeSocket: Socket | null = null;
    let isDisposed = false;

    setBattleContext(battleId, user.id);

    const applyBattleEvent = (event: BattleSocketEvent) => {
      switch (event.type) {
        case 'join':
          addParticipant(event.payload.user);
          if (typeof event.payload.seq === 'number') {
            markAppliedSeq(event.payload.user.id, event.payload.seq);
          }
          break;

        case 'leave':
          removeParticipant(event.payload.userId);
          if (typeof event.payload.seq === 'number') {
            markAppliedSeq(event.payload.userId, event.payload.seq);
          }
          break;

        case 'ready':
          updateParticipant(event.payload.userId, { isReady: event.payload.isReady });
          if (event.payload.userId === user.id) {
            setIsReady(event.payload.isReady);
          }
          if (typeof event.payload.seq === 'number') {
            markAppliedSeq(event.payload.userId, event.payload.seq);
          }
          break;

        case 'start':
          updateRoomStatus('in_progress');
          setTimeLeft(event.payload.duration);
          if (typeof event.payload.seq === 'number') {
            setLastServerSeq(event.payload.seq);
          }
          break;

        case 'timer_sync':
          setTimeLeft(event.payload.timeLeft);
          if (event.payload.timeLeft > 0) {
            updateRoomStatus('in_progress');
          }
          if (typeof event.payload.seq === 'number') {
            setLastServerSeq(event.payload.seq);
          }
          break;

        case 'canvas_update': {
          const shouldApply = typeof event.payload.seq === 'number'
            ? markAppliedSeq(event.payload.userId, event.payload.seq)
            : true;

          if (shouldApply) {
            updateParticipantCanvas(event.payload.userId, event.payload.imageData);
          }
          break;
        }

        case 'chat':
          addMessage(event.payload);
          break;

        case 'finish':
          updateRoomStatus('finished');
          setBattleResult(event.payload);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          break;

        case 'vote':
          if (typeof event.payload.seq === 'number') {
            setLastServerSeq(event.payload.seq);
          }
          break;
      }
    };

    const onBattleEvent = (event: BattleSocketEvent) => {
      applyBattleEvent(event);
    };

    const onResumeState = async (payload: ResumeStatePayload) => {
      if (payload.battleId !== battleId) return;

      try {
        startRecovery();

        for (const [participantId, imageData] of Object.entries(payload.snapshotByUser)) {
          if (typeof imageData === 'string' && imageData.length > 0) {
            updateParticipantCanvas(participantId, imageData);
          }
        }

        payload.missedEvents.forEach((event) => {
          applyBattleEvent(event);
        });

        if (typeof payload.serverSeq === 'number') {
          setLastServerSeq(payload.serverSeq);
        }

        if (typeof payload.timeLeft === 'number') {
          setTimeLeft(payload.timeLeft);
        }

        await flushPendingOps();
        finishRecovery(payload.serverSeq);
      } catch (error) {
        failRecovery(error instanceof Error ? error.message : '복구 중 오류가 발생했습니다.');
      }
    };

    const onConnect = async () => {
      if (!activeSocket) return;

      setConnected(true);
      setError(null);
      setConnectionStatus('connected');

      try {
        const joinAck = await emitWithAck(
          activeSocket,
          'join_battle',
          {
            v: SOCKET_PROTOCOL_VERSION,
            event: 'join_battle',
            battleId,
            opId: createOpId(`join-${user.id}`),
            ackId: createOpId('ack'),
            seq: Math.max(1, lastServerSeq + 1),
            clientTs: Date.now(),
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
              isHost: room?.hostId === user.id,
              isReady: false,
            },
            payload: {},
          },
          { timeoutMs: 2000, retry: 1 }
        );

        if (!joinAck.ok) {
          setError(joinAck.error ?? joinAck.code ?? '대결방 입장에 실패했습니다.');
          return;
        }

        if (lastServerSeq > 0) {
          await requestResume();
        }

        await flushPendingOps();
      } catch (error) {
        setError(error instanceof Error ? error.message : '대결방 입장에 실패했습니다.');
      }
    };

    const onConnectError = (err: Error) => {
      setConnected(false);
      setConnectionStatus('degraded');
      setError(`소켓 연결 오류: ${err.message}`);
    };

    const setupSocket = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isDisposed) return;
      if (!session?.access_token) {
        setError('인증 세션이 없어 대결방에 연결할 수 없습니다.');
        return;
      }

      activeSocket = connectSocket({ token: session.access_token });
      setSocket(activeSocket);

      activeSocket.on('connect', onConnect);
      activeSocket.on('connect_error', onConnectError);
      activeSocket.on('battle_event', onBattleEvent);
      activeSocket.on('battle_resume_state', onResumeState);
    };

    setupSocket();

    return () => {
      isDisposed = true;
      if (!activeSocket) return;

      activeSocket.off('connect', onConnect);
      activeSocket.off('connect_error', onConnectError);
      activeSocket.off('battle_event', onBattleEvent);
      activeSocket.off('battle_resume_state', onResumeState);

      void emitWithAck(
        activeSocket,
        'leave_battle',
        {
          v: SOCKET_PROTOCOL_VERSION,
          event: 'leave_battle',
          battleId,
          opId: createOpId(`leave-${user.id}`),
          ackId: createOpId('ack'),
          seq: Math.max(1, lastServerSeq + 1),
          clientTs: Date.now(),
          payload: {},
        },
        { timeoutMs: 1200, retry: 0 }
      ).catch(() => undefined);

      reset();
      setSocket(null);
    };
  }, [
    battleId,
    user,
    room?.hostId,
    setBattleContext,
    lastServerSeq,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setIsReady,
    updateRoomStatus,
    setTimeLeft,
    updateParticipantCanvas,
    addMessage,
    setBattleResult,
    setLastServerSeq,
    markAppliedSeq,
    setConnected,
    setError,
    setConnectionStatus,
    startRecovery,
    finishRecovery,
    failRecovery,
    flushPendingOps,
    requestResume,
    reset,
  ]);

  const sendChat = useCallback(
    async (content: string) => {
      const activeSocket = socket;
      if (!activeSocket || !activeSocket.connected || !user) {
        return;
      }

      try {
        await emitWithAck(
          activeSocket,
          'chat_message',
          {
            battleId,
            userId: user.id,
            content,
            timestamp: new Date().toISOString(),
          },
          { timeoutMs: 1200, retry: 1 }
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : '채팅 전송 실패');
      }
    },
    [battleId, user, socket, setError]
  );

  const toggleReady = useCallback(
    async (isReady: boolean) => {
      const activeSocket = socket;
      if (!activeSocket || !activeSocket.connected || !user) {
        return;
      }

      try {
        await emitWithAck(
          activeSocket,
          'ready_status',
          {
            battleId,
            isReady,
            opId: createOpId(`ready-${user.id}`),
          },
          { timeoutMs: 1200, retry: 1 }
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : '준비 상태 반영 실패');
      }
    },
    [battleId, user, socket, setError]
  );

  const updateCanvas = useCallback(
    (imageData: string) => {
      void sendSnapshot(imageData);
    },
    [sendSnapshot]
  );

  const startBattle = useCallback(async () => {
    const activeSocket = socket;
    if (!activeSocket || !activeSocket.connected || !user) {
      return;
    }

    try {
      await emitWithAck(
        activeSocket,
        'start_battle',
        {
          v: SOCKET_PROTOCOL_VERSION,
          event: 'start_battle',
          battleId,
          opId: createOpId(`start-${user.id}`),
          ackId: createOpId('ack'),
          seq: Math.max(1, lastServerSeq + 1),
          clientTs: Date.now(),
          payload: {},
        },
        { timeoutMs: 2000, retry: 1 }
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : '배틀 시작 실패');
    }
  }, [battleId, user, socket, lastServerSeq, setError]);

  const vote = useCallback(
    async (paintingUserId: string) => {
      const activeSocket = socket;
      if (!activeSocket || !activeSocket.connected || !user) {
        return;
      }

      const seq = Math.max(1, lastServerSeq + 1);

      try {
        await emitWithAck(
          activeSocket,
          'vote',
          {
            v: SOCKET_PROTOCOL_VERSION,
            event: 'vote',
            battleId,
            opId: createOpId(`vote-${user.id}`),
            ackId: createOpId('ack'),
            seq,
            clientTs: Date.now(),
            payload: {
              paintingUserId,
            },
          },
          { timeoutMs: 2000, retry: 1 }
        );
      } catch (error) {
        setError(error instanceof Error ? error.message : '투표 전송 실패');
      }
    },
    [battleId, user, socket, lastServerSeq, setError]
  );

  return {
    sendChat,
    toggleReady,
    updateCanvas,
    startBattle,
    vote,
  };
}
