import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 대결방 참가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    // 대결방 정보 확인
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .eq('id', id)
      .single();

    if (battleError || !battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // 비밀번호 확인
    if (battle.is_private && battle.password !== password) {
      // 호스트인 경우 비밀번호 무시하고 참가 가능 (이미 참가되어 있을 수 있지만 로직상 허용)
      if (battle.host_id !== user.id) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
      }
    }

    // 인원 제한 확인
    const { count, error: countError } = await supabase
      .from('battle_participants')
      .select('*', { count: 'exact', head: true })
      .eq('battle_id', id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if (count !== null && count >= battle.max_participants) {
      return NextResponse.json({ error: 'Battle is full' }, { status: 400 });
    }

    // 이미 참가 중인지 확인
    const { data: existingParticipant } = await supabase
      .from('battle_participants')
      .select('*')
      .eq('battle_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return NextResponse.json({ message: 'Already joined' }, { status: 200 });
    }

    // 참가 처리
    const { error: joinError } = await supabase
      .from('battle_participants')
      .insert({
        battle_id: id,
        user_id: user.id
      });

    if (joinError) {
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
