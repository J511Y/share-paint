import { NextResponse } from 'next/server';

export function rateLimitJson(error: string, retryAfterMs: number) {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error, retryAfterMs },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}
