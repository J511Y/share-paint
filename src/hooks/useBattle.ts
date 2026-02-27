import { useEffect, useCallback, useRef } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { connectSocket, getSocket } from '@/lib/socket/client';
import type { BattleRoom, BattleSocketEvent, BattleUser } from '@/types/battle';
import { createClient } from '@/lib/supabase/client';
import { useActor } from './useActor';
import { getGuestHeaders, withGuestHeaders } from '@/lib/guest/client';

interface BattleDetailParticipant {
  user_id: string | null;
  guest_id?: string | null;
  guest_name?: string | null;
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
  host_id: string | null;
  host_guest_id?: string | null;
  status: 'waiting' | 'in_progress' | 'finished';
  time_limit: number;
  max_participants: number;
  created_at: string;
  started_at: string | null;
  participants?: BattleDetailParticipant[];
}

function toActorId(userId: string | null, guestId?: string | null): string {
  if (userId) return userId;
  if (guestId) return `guest:${guestId}`;
  return 'guest:unknown';
}

function toBattleUser(participant: BattleDetailParticipant, hostId: string): BattleUser {
  const actorId = toActorId(participant.user_id, participant.guest_id);
  const fallbackName = participant.guest_name || `guest-${actorId.slice(0, 6)}`;
  const username = participant.profile?.username || fallbackName;

  return {
    id: actorId,
    username,
    displayName: participant.profile?.display_name ?? participant.guest_name ?? username,
    avatarUrl: participant.profile?.avatar_url ?? null,
    isHost: actorId === hostId,
    isReady: false,
  };
}

function toBattleRoom(payload: BattleDetailResponse): BattleRoom {
  const hostId = toActorId(payload.host_id, payload.host_guest_id);

  return {
    id: payload.id,
    title: payload.title,
    hostId,
    topic: payload.topic,
    timeLimit: payload.time_limit,
    maxParticipants: payload.max_participants,
    status: payload.status,
    participants: (payload.participants || []).map((participant) => toBattleUser(participant, hostId)),
    createdAt: payload.created_at,
    startedAt: payload.started_at,
  };
}

export function useBattle(battleId: string) {
  const { actor } = useActor();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    room,
    setRoom,
    setParticipants,
    setIsHost,
    updateRoomStatus,
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
  } = useBattleStore();

  useEffect(() => {
    if (!battleId || !actor) return;

    let disposed = false;

    const loadBattle = async () => {
      try {
        const response = await fetch(`/api/battle/${battleId}`, withGuestHeaders());
        if (!response.ok) {
          throw new Error('대결방 정보를 불러오지 못했습니다.');
        }

        const payload = (await response.json()) as BattleDetailResponse;
        if (disposed) return;

        const roomData = toBattleRoom(payload);
        setRoom(roomData);
        setParticipants(roomData.participants);
        setIsHost(roomData.hostId === actor.id);
      } catch (error) {
        if (!disposed) {
          setError(error instanceof Error ? error.message : '대결방 정보를 불러오지 못했습니다.');
        }
      }
    };

    void loadBattle();

    return () => {
      disposed = true;
    };
  }, [battleId, actor, setRoom, setParticipants, setIsHost, setError]);

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

  useEffect(() => {
    if (!battleId || !actor) return;

    let socket: ReturnType<typeof getSocket> | null = null;
    let isDisposed = false;

    const onConnect = () => {
      setConnected(true);
      setError(null);

      socket?.emit('join_battle', {
        battleId,
        user: {
          id: actor.id,
          username: actor.username,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl,
        },
      });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = (err: Error) => {
      setConnected(false);
      setError(`소켓 연결 오류: ${err.message}`);
    };

    const onBattleEvent = (event: BattleSocketEvent) => {
      switch (event.type) {
        case 'join':
          addParticipant(event.payload.user);
          break;

        case 'leave':
          removeParticipant(event.payload.userId);
          break;

        case 'ready':
          updateParticipant(event.payload.userId, { isReady: event.payload.isReady });
          if (event.payload.userId === actor.id) {
            setIsReady(event.payload.isReady);
          }
          break;

        case 'start':
          updateRoomStatus('in_progress');
          setTimeLeft(event.payload.duration);
          break;

        case 'timer_sync':
          setTimeLeft(event.payload.timeLeft);
          if (event.payload.timeLeft > 0) {
            updateRoomStatus('in_progress');
          }
          break;

        case 'canvas_update':
          updateParticipantCanvas(event.payload.userId, event.payload.imageData);
          break;

        case 'chat':
          addMessage(event.payload);
          break;

        case 'finish':
          updateRoomStatus('finished');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          break;

        case 'vote':
          break;
      }
    };

    const setupSocket = async () => {
      try {
        const joinResponse = await fetch(
          `/api/battle/${battleId}/join`,
          withGuestHeaders({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        );

        if (!joinResponse.ok) {
          let message = '대결방 참가에 실패했습니다.';
          try {
            const errorBody = (await joinResponse.json()) as { message?: string };
            if (typeof errorBody?.message === 'string' && errorBody.message.length > 0) {
              message = errorBody.message;
            }
          } catch {
            // ignore JSON parse errors and keep default message
          }
          throw new Error(message);
        }

        if (isDisposed) return;

        if (actor.userId) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) {
            throw new Error('인증 세션이 없어 대결방에 연결할 수 없습니다.');
          }

          socket = connectSocket({ token: session.access_token });
        } else {
          const guestHeaders = getGuestHeaders();
          socket = connectSocket({
            guestId: guestHeaders['x-guest-id'],
            guestName: guestHeaders['x-guest-name'],
          });
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onConnectError);
        socket.on('battle_event', onBattleEvent);
      } catch (error) {
        setError(error instanceof Error ? error.message : '대결방 연결에 실패했습니다.');
      }
    };

    void setupSocket();

    return () => {
      isDisposed = true;
      if (!socket) return;

      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('battle_event', onBattleEvent);

      socket.emit('leave_battle', { battleId });
      reset();
    };
  }, [
    battleId,
    actor,
    setConnected,
    setError,
    addParticipant,
    removeParticipant,
    updateParticipant,
    updateRoomStatus,
    updateParticipantCanvas,
    addMessage,
    setIsReady,
    setTimeLeft,
    reset,
  ]);

  const sendChat = useCallback(
    (content: string) => {
      const socket = getSocket();
      if (socket.connected && actor) {
        socket.emit('chat_message', {
          battleId,
          userId: actor.id,
          content,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [battleId, actor]
  );

  const toggleReady = useCallback(
    (isReady: boolean) => {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('ready_status', { battleId, isReady });
      }
    },
    [battleId]
  );

  const updateCanvas = useCallback(
    (imageData: string) => {
      const socket = getSocket();
      if (socket.connected && actor) {
        socket.emit('canvas_update', {
          battleId,
          userId: actor.id,
          imageData,
        });
      }
    },
    [battleId, actor]
  );

  const startBattle = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('start_battle', { battleId });
    }
  }, [battleId]);

  const vote = useCallback(
    (paintingUserId: string) => {
      const socket = getSocket();
      if (socket.connected && actor) {
        socket.emit('vote', {
          battleId,
          voterId: actor.id,
          paintingUserId,
        });
      }
    },
    [battleId, actor]
  );

  return {
    sendChat,
    toggleReady,
    updateCanvas,
    startBattle,
    vote,
  };
}
