import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
import type { LikeInsert } from '@/types/database';
import { resolveApiActor } from '@/lib/api-actor';
import { getUuidParam } from '@/lib/validation/params';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid painting id.', requestId);
  }

  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Guest identity is required.', requestId);
  }

  const rateLimit = consumeRateLimit(`painting:like:${actor.actorId}`, 30, 60 * 1000);
  if (!rateLimit.allowed) {
    return rateLimitJson('좋아요 요청이 너무 빠릅니다.', rateLimit.retryAfterMs);
  }

  const likeData = {
    user_id: actor.userId ?? undefined,
    guest_id: actor.guestId,
    painting_id: paintingId,
  } as LikeInsert;

  const { error } = await supabase.from('likes').insert(likeData);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: 'Already liked' }, { status: 200 });
    }
    return apiErrorResponse(500, 'INTERNAL_ERROR', '좋아요 처리 중 오류가 발생했습니다.', requestId);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid painting id.', requestId);
  }

  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Guest identity is required.', requestId);
  }

  let query = supabase.from('likes').delete().eq('painting_id', paintingId);

  if (actor.userId) {
    query = query.eq('user_id', actor.userId);
  } else if (actor.guestId) {
    query = query.eq('guest_id', actor.guestId);
  }

  const { error } = await query;

  if (error) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '좋아요 취소 중 오류가 발생했습니다.', requestId);
  }

  return NextResponse.json({ success: true });
}
