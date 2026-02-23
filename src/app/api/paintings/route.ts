import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
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
  const supabase = await createClient();

  try {
    const actor = await resolveApiActor(request, supabase);
    if (!actor) {
      return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
    }

    const rateLimit = consumeRateLimit(`painting:create:${actor.actorId}`, 8, 10 * 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitJson('요청이 너무 빠릅니다. 잠시 후 다시 시도해주세요.', rateLimit.retryAfterMs);
    }

    const rawBody = await request.json();
    const parsedBody = PaintingCreatePayloadSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsedPainting = ApiPaintingSchema.safeParse(data);
    if (!parsedPainting.success) {
      return NextResponse.json({ error: 'Invalid painting response payload.' }, { status: 500 });
    }

    return NextResponse.json(parsedPainting.data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });
    }
  }

  if (battleId) {
    const parsedBattleId = z.string().uuid().safeParse(battleId);
    if (!parsedBattleId.success) {
      return NextResponse.json({ error: 'Invalid battleId.' }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedPaintings = ApiPaintingArraySchema.safeParse(data ?? []);
  if (!parsedPaintings.success) {
    return NextResponse.json({ error: 'Invalid paintings response payload.' }, { status: 500 });
  }

  return NextResponse.json(parsedPaintings.data);
}
