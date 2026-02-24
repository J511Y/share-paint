import { afterEach, describe, expect, it, vi } from 'vitest';
import { BATTLE_CONNECTIVITY_EVENT, emitBattleConnectivity } from './battle-connectivity';

describe('emitBattleConnectivity', () => {
  afterEach(() => {
    delete (window as unknown as { __paintshareTelemetry?: unknown }).__paintshareTelemetry;
  });
  it('dispatches window custom event with detail payload', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    emitBattleConnectivity('degraded', { retryMs: 30000 });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe(BATTLE_CONNECTIVITY_EVENT);
    expect(event.detail.status).toBe('degraded');
    expect(event.detail.retryMs).toBe(30000);
  });

  it('forwards payload to optional telemetry sink when available', () => {
    const track = vi.fn();
    (window as unknown as { __paintshareTelemetry?: { track: typeof track } }).__paintshareTelemetry = {
      track,
    };

    emitBattleConnectivity('recovered', { retryMs: 10000 });

    expect(track).toHaveBeenCalledWith(
      'battle_connectivity',
      expect.objectContaining({ status: 'recovered', retryMs: 10000 })
    );
  });
});
