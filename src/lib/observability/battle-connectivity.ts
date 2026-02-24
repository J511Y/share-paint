export type BattleConnectivityStatus = 'degraded' | 'recovered';

export const BATTLE_CONNECTIVITY_EVENT = 'paintshare:battle-connectivity';

export function emitBattleConnectivity(status: BattleConnectivityStatus, meta: { retryMs: number }) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(BATTLE_CONNECTIVITY_EVENT, {
      detail: {
        status,
        retryMs: meta.retryMs,
        at: Date.now(),
      },
    })
  );
}
