import { describe, expect, it } from 'vitest';

import { createSocketMetric, isHealthySocketLatency } from './metrics';

describe('socket metrics helpers', () => {
  it('creates socket metric with timestamp', () => {
    const metric = createSocketMetric({
      event: 'canvas_update',
      roomId: 'room-1',
      userId: 'user-1',
      latencyMs: 120,
      success: true,
    });

    expect(metric.event).toBe('canvas_update');
    expect(metric.roomId).toBe('room-1');
    expect(metric.success).toBe(true);
    expect(new Date(metric.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('uses 300ms as default healthy latency threshold', () => {
    expect(isHealthySocketLatency(250)).toBe(true);
    expect(isHealthySocketLatency(301)).toBe(false);
  });

  it('accepts custom healthy latency threshold', () => {
    expect(isHealthySocketLatency(450, 500)).toBe(true);
    expect(isHealthySocketLatency(550, 500)).toBe(false);
  });
});
