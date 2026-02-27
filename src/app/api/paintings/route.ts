import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
import {
  ApiPaintingArraySchema,
  ApiPaintingSchema,
  PaintingCreatePayloadSchema,
} from '@/lib/validation/schemas';
import type { PaintingInsert } from '@/types/database';
import { resolveApiActor } from '@/lib/api-actor';
import {
  consumeRateLimit,
  consumeDuplicateContentGuard,
} from '@/lib/security/action-rate-limit';
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const supabase = await createClient();

  try {
    const actor = await resolveApiActor(request, supabase);
    if (!actor) {
      return apiErrorResponse(400, 'BAD_REQUEST', 'Guest identity is required.', requestId);
    }

    const rateLimit = consumeRateLimit(`painting:create:${actor.actorId}`, 8, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitJson('요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.', rateLimit.retryAfterMs);
    }

    const rawBody = await request.json();
    const parsedBody = PaintingCreatePayloadSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid request body.', requestId, parsedBody.error.issues);
    }

    const duplicateGuard = consumeDuplicateContentGuard(
      `painting:topic:${actor.actorId}`,
      `${parsedBody.data.topic}:${parsedBody.data.image_url.slice(0, 64)}`,
      3000
    );

    if (!duplicateGuard.allowed) {
      return rateLimitJson(
        '동일한 그림 요청이 너무 빠르게 반복되고 있습니다.',
        duplicateGuard.retryAfterMs
      );
    }

    const paintingData = {
      ...parsedBody.data,
      user_id: actor.userId ?? undefined,
      guest_id: actor.guestId,
      guest_name: actor.userId ? null : actor.displayName,
    } as PaintingInsert;

    const { data, error } = await supabase
      .from('paintings')
      .insert(paintingData)
      .select(
        `
        *,
        profile:profiles(*)
      `
      )
      .single();

    if (error) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '그림 저장에 실패했습니다.', requestId);
    }

    const parsedPainting = ApiPaintingSchema.safeParse(data);
    if (!parsedPainting.success) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '그림 응답 데이터 형식이 유효하지 않습니다.', requestId, parsedPainting.error.issues);
    }

    return NextResponse.json(parsedPainting.data);
  } catch {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid request', requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const battleId = searchParams.get('battleId');

  const parsedLimit = z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(20)
    .safeParse(searchParams.get('limit'));
  const limit = parsedLimit.success ? parsedLimit.data : 20;

  if (userId) {
    const parsedUserId = z.string().uuid().safeParse(userId);
    if (!parsedUserId.success) {
      return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid userId.', requestId);
    }
  }

  if (battleId) {
    const parsedBattleId = z.string().uuid().safeParse(battleId);
    if (!parsedBattleId.success) {
      return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid battleId.', requestId);
    }
  }

  let query = supabase
    .from('paintings')
    .select(
      `
      *,
      profile:profiles(*)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (battleId) {
    query = query.eq('battle_id', battleId);
  }

  const { data, error } = await query;

  if (error) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '그림 목록 조회에 실패했습니다.', requestId);
  }

  const parsedPaintings = ApiPaintingArraySchema.safeParse(data ?? []);
  if (!parsedPaintings.success) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '그림 목록 응답 데이터 형식이 유효하지 않습니다.', requestId, parsedPaintings.error.issues);
  }

  return NextResponse.json(parsedPaintings.data);
}
