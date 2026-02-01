import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PaintingInsert } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 인증 확인
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { image_url, topic, time_limit, actual_time, battle_id } = body;

    // 유효성 검사
    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const paintingData: PaintingInsert = {
      user_id: user.id,
      image_url,
      topic,
      time_limit: time_limit || 0,
      actual_time: actual_time || 0,
      battle_id: battle_id || null,
    };

    const { data, error } = await supabase
      .from('paintings')
      .insert(paintingData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const battleId = searchParams.get('battleId');
  const limit = parseInt(searchParams.get('limit') || '20');

  let query = supabase
    .from('paintings')
    .select(`
      *,
      profile:profiles(*)
    `)
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

  return NextResponse.json(data);
}
