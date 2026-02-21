import { useEffect, useCallback, useRef } from 'react';
import { useBattleStore } from '@/stores/battleStore';
import { connectSocket, getSocket } from '@/lib/socket/client';
import type { BattleSocketEvent, BattleUser } from '@/types/battle';
import { useAuth } from './useAuth';
import { createClient } from '@/lib/supabase/client';

export function useBattle(battleId: string) {
  const { user } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    setIsHost,
    setIsReady,
    setBattleResult,
    timeLeft,
    setTimeLeft,
    decrementTime
  } = useBattleStore();

  // 타이머 로직
  useEffect(() => {
    if (room?.status === 'in_progress' && timeLeft > 0) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          decrementTime();
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [room?.status, timeLeft, decrementTime]);

  // 소켓 이벤트 핸들러 설정
  useEffect(() => {
    if (!battleId || !user) return;

    let socket: ReturnType<typeof getSocket> | null = null;
    let isDisposed = false;

    const onConnect = () => {
      setConnected(true);
      setError(null);
      socket?.emit('join_battle', { battleId, user }, (ack?: { ok: boolean; error?: string }) => {
        if (!ack?.ok) {
          setError(`대결방 입장 실패: ${ack?.error || '알 수 없는 오류'}`);
          setConnected(false);
        }
      });
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = (err: Error) => {
      setConnected(false);
      setError(`소켓 연결 오류: ${err.message}`);
    };

    // 서버로부터의 이벤트 처리
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
          if (event.payload.userId === user.id) {
            setIsReady(event.payload.isReady);
          }
          break;
          
        case 'start':
          updateRoomStatus('in_progress');
          setTimeLeft(event.payload.duration); // 서버에서 받은 시간으로 설정
          break;
          
        case 'timer_sync': // 타입 정의 추가 필요
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
          // 결과 처리 로직
          break;
      }
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

      socket = connectSocket({
        token: session.access_token,
      });

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('connect_error', onConnectError);
      socket.on('battle_event', onBattleEvent);
    };

    setupSocket();

    return () => {
      isDisposed = true;
      if (!socket) return;

      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('battle_event', onBattleEvent);
      
      // 컴포넌트 언마운트 시 소켓 연결 해제 (선택사항, 페이지 이동 시 유지하려면 제외)
      // disconnectSocket(); 
      socket.emit('leave_battle', { battleId });
      reset();
    };
  }, [battleId, user, setConnected, setError, addParticipant, removeParticipant, updateParticipant, updateRoomStatus, updateParticipantCanvas, addMessage, setIsReady, reset]);

  // 액션 메서드들
  const sendChat = useCallback((content: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit(
        'chat_message',
        {
          battleId,
          userId: user?.id,
          content,
          timestamp: new Date().toISOString()
        },
        (ack?: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            setError(`채팅 전송 실패: ${ack.error || '알 수 없는 오류'}`);
          }
        }
      );
    }
  }, [battleId, user, setError]);

  const toggleReady = useCallback((isReady: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('ready_status', { battleId, isReady }, (ack?: { ok: boolean; error?: string }) => {
        if (ack && !ack.ok) {
          setError(`준비 상태 반영 실패: ${ack.error || '알 수 없는 오류'}`);
        }
      });
    }
  }, [battleId, setError]);

  const updateCanvas = useCallback((imageData: string) => {
    const socket = getSocket();
    if (socket.connected && user) {
      socket.emit(
        'canvas_update',
        {
          battleId,
          userId: user.id,
          imageData,
        },
        (ack?: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            setError(`그림 동기화 실패: ${ack.error || '알 수 없는 오류'}`);
          }
        }
      );
    }
  }, [battleId, user, setError]);

  const startBattle = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('start_battle', { battleId }, (ack?: { ok: boolean; error?: string; reason?: string }) => {
        if (ack && !ack.ok) {
          setError(`배틀 시작 실패: ${ack.error || '알 수 없는 오류'}`);
        }
      });
    }
  }, [battleId, setError]);

  const vote = useCallback((paintingUserId: string) => {
    const socket = getSocket();
    if (socket.connected && user) {
      socket.emit(
        'vote',
        {
          battleId,
          voterId: user.id,
          paintingUserId,
        },
        (ack?: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            setError(`투표 전송 실패: ${ack.error || '알 수 없는 오류'}`);
          }
        }
      );
    }
  }, [battleId, user, setError]);

  return {
    sendChat,
    toggleReady,
    updateCanvas,
    startBattle,
    vote
  };
}
