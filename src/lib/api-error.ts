import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'ROOM_FULL'
  | 'INVALID_PASSWORD'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  traceId: string;
}

export function createApiError(
  code: ApiErrorCode,
  message: string,
  traceId: string,
  details?: unknown
): ApiErrorBody {
  return {
    code,
    message,
    details,
    traceId,
  };
}

export function apiErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  traceId: string,
  details?: unknown
) {
  return NextResponse.json(createApiError(code, message, traceId, details), {
    status,
  });
}
