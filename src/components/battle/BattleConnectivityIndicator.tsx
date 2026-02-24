'use client';

import { useEffect, useState } from 'react';
import { BATTLE_CONNECTIVITY_EVENT, type BattleConnectivityStatus } from '@/lib/observability/battle-connectivity';
import { cn } from '@/lib/utils';

type ConnectivityState = {
  status: BattleConnectivityStatus;
  retryMs: number;
} | null;

export function BattleConnectivityIndicator() {
  const [state, setState] = useState<ConnectivityState>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as ConnectivityState;
      if (!detail?.status) return;
      setState(detail);
    };

    window.addEventListener(BATTLE_CONNECTIVITY_EVENT, handler);
    return () => window.removeEventListener(BATTLE_CONNECTIVITY_EVENT, handler);
  }, []);

  if (!state) {
    return (
      <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500">
        연결 상태: 정상
      </span>
    );
  }

  const degraded = state.status === 'degraded';

  return (
    <span
      className={cn(
        'rounded-full border px-2 py-1 text-xs',
        degraded
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      )}
    >
      {degraded
        ? `연결 상태: 불안정 (자동 재시도 ${Math.round(state.retryMs / 1000)}초)`
        : '연결 상태: 복구됨'}
    </span>
  );
}
