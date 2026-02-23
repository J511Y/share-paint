import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LikeInsert } from '@/types/database';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paintingId } = await params;
  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paintingId } = await params;
  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  let query = supabase.from('likes').delete().eq('painting_id', paintingId);

  if (actor.userId) {
    query = query.eq('user_id', actor.userId);
  } else if (actor.guestId) {
    query = query.eq('guest_id', actor.guestId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
