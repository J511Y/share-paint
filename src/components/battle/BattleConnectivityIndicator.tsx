'use client';

import { useEffect, useState } from 'react';
import { BATTLE_CONNECTIVITY_EVENT, type BattleConnectivityStatus } from '@/lib/observability/battle-connectivity';
import { cn } from '@/lib/utils';

type ConnectivityState = {
  status: BattleConnectivityStatus;
  retryMs: number;
} | null;

const RECOVERED_BADGE_TTL_MS = 6000;

export function BattleConnectivityIndicator({ className }: { className?: string }) {
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

  useEffect(() => {
    if (state?.status !== 'recovered') return;

    const timer = setTimeout(() => {
      setState(null);
    }, RECOVERED_BADGE_TTL_MS);

    return () => clearTimeout(timer);
  }, [state]);

  if (!state) {
    return (
      <span
        aria-live="polite"
        className={cn(
          'rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500',
          className
        )}
      >
        연결 상태: 정상
      </span>
    );
  }

  const degraded = state.status === 'degraded';

  return (
    <span
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
        degraded
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full',
          degraded ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
        )}
        aria-hidden="true"
      />
      {degraded
        ? `연결 상태: 불안정 (자동 재시도 ${Math.round(state.retryMs / 1000)}초)`
        : '연결 상태: 복구됨'}
    </span>
  );
}
