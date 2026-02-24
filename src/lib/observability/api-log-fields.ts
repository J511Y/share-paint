export interface ApiLogFieldInput {
  requestId: string;
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
}

export function buildApiLogFields(input: ApiLogFieldInput): Record<string, unknown> {
  return {
    requestId: input.requestId,
    path: input.path,
    method: input.method,
    statusCode: input.statusCode,
    durationMs: input.durationMs,
    userId: input.userId ?? null,
  };
}
