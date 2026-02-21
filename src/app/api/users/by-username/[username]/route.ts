import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiProfileSchema, ProfileWithCountsSchema } from '@/lib/validation/schemas';
import { getStringParam } from '@/lib/validation/params';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const resolvedParams = await params;
  const username = getStringParam(resolvedParams, 'username');
  if (!username) {
    return NextResponse.json({ error: '사용자명 형식이 유효하지 않습니다.' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '사용자 정보를 조회할 수 없습니다.' }, { status: 404 });
  }

  const parsedProfile = ApiProfileSchema.safeParse(data);
  if (!parsedProfile.success) {
    return NextResponse.json({ error: '사용자 데이터가 유효하지 않습니다.' }, { status: 500 });
  }

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', parsedProfile.data.id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', parsedProfile.data.id);

  const { data: { user } } = await supabase.auth.getUser();
  let isFollowing = false;
  if (user) {
    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
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
    return NextResponse.json({ error: '사용자 응답 데이터 형식이 유효하지 않습니다.' }, { status: 500 });
  }

  return NextResponse.json(responsePayload.data);
}
