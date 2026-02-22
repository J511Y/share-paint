export interface SocketMetric {
  event: string;
  roomId: string;
  userId?: string;
  latencyMs?: number;
  success: boolean;
  timestamp: string;
}

export function createSocketMetric(input: Omit<SocketMetric, 'timestamp'>): SocketMetric {
  return {
    ...input,
    timestamp: new Date().toISOString(),
  };
}

export function isHealthySocketLatency(latencyMs: number, thresholdMs = 300): boolean {
  return latencyMs <= thresholdMs;
}
