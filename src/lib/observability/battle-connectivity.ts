export type BattleConnectivityStatus = 'degraded' | 'recovered';

export const BATTLE_CONNECTIVITY_EVENT = 'paintshare:battle-connectivity';

export function emitBattleConnectivity(status: BattleConnectivityStatus, meta: { retryMs: number }) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  const detail = {
    status,
    retryMs: meta.retryMs,
    at: Date.now(),
  };

  window.dispatchEvent(
    new CustomEvent(BATTLE_CONNECTIVITY_EVENT, {
      detail,
    })
  );

  try {
    const telemetry = (window as unknown as {
      __paintshareTelemetry?: { track?: (name: string, payload: unknown) => void };
    }).__paintshareTelemetry;

    telemetry?.track?.('battle_connectivity', detail);
  } catch {
    // no-op: telemetry sink is optional
  }
}
