import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { getUuidParam } from '@/lib/validation/params';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const targetUserId = getUuidParam(resolvedParams, 'id');
  if (!targetUserId) {
    return NextResponse.json({ error: '잘못된 사용자 id입니다.' }, { status: 400 });
  }

  const supabase = await createClient();
  const actor = await resolveApiActor(request, supabase);

  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  if (actor.userId === targetUserId) {
    return NextResponse.json({ error: '자신을 팔로우할 수 없습니다.' }, { status: 400 });
  }

  const rateLimit = consumeRateLimit(`user:follow:${actor.actorId}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: '팔로우 요청이 너무 빠릅니다.' }, { status: 429 });
  }

  const insertData = {
    follower_id: actor.userId ?? undefined,
    follower_guest_id: actor.guestId,
    following_id: targetUserId,
  } as Database['public']['Tables']['follows']['Insert'];

  const { error } = await supabase.from('follows').insert(insertData);

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ message: '이미 팔로우 중입니다.' }, { status: 200 });
    }
    return NextResponse.json({ error: '팔로우에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const targetUserId = getUuidParam(resolvedParams, 'id');
  if (!targetUserId) {
    return NextResponse.json({ error: '잘못된 사용자 id입니다.' }, { status: 400 });
  }

  const supabase = await createClient();
  const actor = await resolveApiActor(request, supabase);

  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  let query = supabase.from('follows').delete().eq('following_id', targetUserId);

  if (actor.userId) {
    query = query.eq('follower_id', actor.userId);
  } else if (actor.guestId) {
    query = query.eq('follower_guest_id', actor.guestId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: '언팔로우에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
