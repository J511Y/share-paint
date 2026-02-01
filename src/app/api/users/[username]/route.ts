import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const supabase = await createClient();

  // 프로필 정보 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (error) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 팔로워/팔로잉 수 조회
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  // 현재 로그인한 유저와의 팔로우 관계 확인
  const { data: { user } } = await supabase.auth.getUser();
  let isFollowing = false;

  if (user) {
    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single();
    
    isFollowing = !!followData;
  }

  return NextResponse.json({
    ...profile,
    followersCount: followersCount || 0,
    followingCount: followingCount || 0,
    isFollowing,
  });
}
