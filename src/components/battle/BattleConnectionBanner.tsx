'use client';

import { useCollabStore } from '@/stores/collabStore';

const statusMessage: Record<string, string> = {
  connecting: '서버 연결 중입니다.',
  connected: '연결됨',
  reconnecting: '재연결 중… 작업은 로컬 대기열에 보관됩니다.',
  recovering: '상태 복구 중… 잠시만 기다려주세요.',
  degraded: '네트워크가 불안정합니다. 실시간 반영이 지연될 수 있습니다.',
  disconnected: '연결이 끊겼습니다. 자동으로 재시도합니다.',
};

const statusStyle: Record<string, string> = {
  connecting: 'bg-blue-50 text-blue-700 border-blue-100',
  connected: 'bg-green-50 text-green-700 border-green-100',
  reconnecting: 'bg-amber-50 text-amber-700 border-amber-100',
  recovering: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  degraded: 'bg-orange-50 text-orange-700 border-orange-100',
  disconnected: 'bg-red-50 text-red-700 border-red-100',
};

export function BattleConnectionBanner() {
  const connectionStatus = useCollabStore((state) => state.connectionStatus);
  const reconnectAttempt = useCollabStore((state) => state.reconnectAttempt);

  if (connectionStatus === 'connected') {
    return null;
  }

  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${statusStyle[connectionStatus]}`}
      role="status"
      aria-live="polite"
    >
      {statusMessage[connectionStatus]}
      {connectionStatus === 'reconnecting' && reconnectAttempt > 0 ? ` (시도 ${reconnectAttempt})` : ''}
    </div>
  );
}
