import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import { getUuidParam } from '@/lib/validation/params';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const targetUserId = getUuidParam(resolvedParams, 'id');
  if (!targetUserId) {
    return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  if (user.id === targetUserId) {
    return NextResponse.json({ error: '자신을 팔로우할 수 없습니다.' }, { status: 400 });
  }

  const insertData: Database['public']['Tables']['follows']['Insert'] = {
    follower_id: user.id,
    following_id: targetUserId,
  };

  const { error } = await supabase
    .from('follows')
    .insert(insertData);

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
    return NextResponse.json({ error: '유효한 사용자 ID가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId);

  if (error) {
    return NextResponse.json({ error: '언팔로우에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
