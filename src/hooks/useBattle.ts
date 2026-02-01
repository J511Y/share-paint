import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useBattleStore } from '@/stores/battleStore';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket/client';
import type { BattleSocketEvent, BattleUser } from '@/types/battle';
import { useAuth } from './useAuth';

export function useBattle(battleId: string) {
  const router = useRouter();
  const { user } = useAuth();
  
  const {
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
    setIsReady
  } = useBattleStore();

  // 소켓 이벤트 핸들러 설정
  useEffect(() => {
    if (!battleId || !user) return;

    const socket = connectSocket();

    // 연결 성공 시
    const onConnect = () => {
      setConnected(true);
      setError(null);
      
      // 대결방 입장 요청
      socket.emit('join_battle', { 
        battleId, 
        user: {
          id: user.id,
          username: user.email?.split('@')[0] || 'Unknown', // 임시
          displayName: user.user_metadata?.display_name,
          avatarUrl: user.user_metadata?.avatar_url,
          isHost: false, // 서버에서 검증 후 업데이트
          isReady: false
        }
      });
    };

    // 연결 끊김
    const onDisconnect = () => {
      setConnected(false);
    };

    // 연결 에러
    const onConnectError = (err: Error) => {
      setError(err.message);
      setConnected(false);
    };

    // 서버로부터의 이벤트 처리
    const onBattleEvent = (event: BattleSocketEvent) => {
      switch (event.type) {
        case 'join':
          addParticipant(event.payload.user);
          // 내가 호스트인지 확인 (여기서는 간단히 처리, 실제로는 서버 응답에 포함되어야 함)
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
          // 추가적인 시작 로직 (타이머 등)
          break;
          
        case 'canvas_update':
          updateParticipantCanvas(event.payload.userId, event.payload.imageData);
          break;
          
        case 'chat':
          addMessage(event.payload);
          break;
          
        case 'finish':
          updateRoomStatus('finished');
          // 결과 처리 로직
          break;
      }
    };

    // 초기 방 정보 수신 (join_success 같은 이벤트가 필요할 수 있음)
    // 현재는 API로 먼저 방 정보를 가져왔다고 가정하거나, 소켓 연결 후 받아옴

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('battle_event', onBattleEvent);

    return () => {
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
    if (socket.connected && user) {
      socket.emit('chat_message', {
        battleId,
        userId: user.id,
        content,
        timestamp: new Date().toISOString()
      });
    }
  }, [battleId, user]);

  const toggleReady = useCallback((isReady: boolean) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('ready_status', { battleId, isReady });
    }
  }, [battleId]);

  const updateCanvas = useCallback((imageData: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('canvas_update', { battleId, imageData });
    }
  }, [battleId]);

  const startBattle = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('start_battle', { battleId });
    }
  }, [battleId]);

  return {
    sendChat,
    toggleReady,
    updateCanvas,
    startBattle
  };
}
