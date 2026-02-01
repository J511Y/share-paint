import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { BattleInsert } from '@/types/database';

// 대결방 목록 조회
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'waiting';

  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      host:profiles!host_id(*),
      participants:battle_participants(count)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 대결방 생성
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, time_limit, max_participants, is_private, password, topic } = body;

    // 유효성 검사
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (is_private && !password) {
      return NextResponse.json({ error: 'Password is required for private rooms' }, { status: 400 });
    }

    // 대결방 생성
    const battleData: BattleInsert = {
      host_id: user.id,
      title,
      time_limit: parseInt(time_limit),
      max_participants: parseInt(max_participants) || 10,
      is_private: !!is_private,
      password: password || null,
      topic: topic || null,
    };

    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .insert(battleData)
      .select()
      .single();

    if (battleError) {
      return NextResponse.json({ error: battleError.message }, { status: 500 });
    }

    // 호스트를 참가자로 자동 등록
    const { error: joinError } = await supabase
      .from('battle_participants')
      .insert({
        battle_id: battle.id,
        user_id: user.id
      });

    if (joinError) {
      // 실패 시 대결방 삭제 (롤백)
      await supabase.from('battles').delete().eq('id', battle.id);
      return NextResponse.json({ error: joinError.message }, { status: 500 });
    }

    return NextResponse.json(battle);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
