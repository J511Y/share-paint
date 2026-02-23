import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { useCollabStore } from '@/stores/collabStore';
import { useBattleStore } from '@/stores/battleStore';

export function useConnectionState(socket: Socket | null) {
  const setConnected = useBattleStore((state) => state.setConnected);
  const setConnectionStatus = useCollabStore((state) => state.setConnectionStatus);
  const setSessionId = useCollabStore((state) => state.setSessionId);
  const incrementReconnectAttempt = useCollabStore((state) => state.incrementReconnectAttempt);
  const clearReconnectAttempt = useCollabStore((state) => state.clearReconnectAttempt);
  const markDisconnected = useCollabStore((state) => state.markDisconnected);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      setConnectionStatus('connected');
      setSessionId(socket.id ?? null);
      clearReconnectAttempt();
    };

    const onDisconnect = () => {
      setConnected(false);
      markDisconnected();
      setSessionId(null);
    };

    const onReconnectAttempt = () => {
      setConnected(false);
      incrementReconnectAttempt();
    };

    const onReconnectFailed = () => {
      setConnected(false);
      setConnectionStatus('degraded');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect_error', onReconnectFailed);
    socket.io.on('reconnect_failed', onReconnectFailed);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect_error', onReconnectFailed);
      socket.io.off('reconnect_failed', onReconnectFailed);
    };
  }, [
    socket,
    setConnected,
    setConnectionStatus,
    setSessionId,
    incrementReconnectAttempt,
    clearReconnectAttempt,
    markDisconnected,
  ]);
}
