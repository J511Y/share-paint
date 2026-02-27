import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
import { ApiProfileSchema, ProfileWithCountsSchema } from '@/lib/validation/schemas';
import { getStringParam } from '@/lib/validation/params';
import { resolveApiActor } from '@/lib/api-actor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const resolvedParams = await params;
  const username = getStringParam(resolvedParams, 'username');
  if (!username) {
    return apiErrorResponse(400, 'BAD_REQUEST', '사용자명 형식이 유효하지 않습니다.', requestId);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return apiErrorResponse(404, 'NOT_FOUND', '사용자 정보를 조회할 수 없습니다.', requestId);
  }

  const parsedProfile = ApiProfileSchema.safeParse(data);
  if (!parsedProfile.success) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '사용자 데이터가 유효하지 않습니다.', requestId, parsedProfile.error.issues);
  }

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', parsedProfile.data.id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', parsedProfile.data.id);

  const actor = await resolveApiActor(request, supabase);
  let isFollowing = false;

  if (actor?.userId) {
    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', actor.userId)
      .eq('following_id', parsedProfile.data.id)
      .single();

    isFollowing = !!followData;
  } else if (actor?.guestId) {
    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_guest_id', actor.guestId)
      .eq('following_id', parsedProfile.data.id)
      .single();

    isFollowing = !!followData;
  }

  const responsePayload = ProfileWithCountsSchema.safeParse({
    ...parsedProfile.data,
    followersCount: followersCount || 0,
    followingCount: followingCount || 0,
    isFollowing,
  });

  if (!responsePayload.success) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '사용자 응답 데이터 형식이 유효하지 않습니다.', requestId, responsePayload.error.issues);
  }

  return NextResponse.json(responsePayload.data);
}
