import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');

  let query = supabase.from('topics').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  // PostgreSQL의 random() 함수를 사용하여 랜덤 정렬 (RPC 호출이 아님)
  // Supabase JS 클라이언트에서는 .order('random()') 지원이 제한적일 수 있음.
  // 대안: RPC를 만들거나, 클라이언트 사이드에서 처리하지 않고,
  // 1. 전체 ID 목록을 가져와서 하나 뽑기 (비효율적)
  // 2. PostgreSQL 함수 `get_random_topic` 생성 (권장)
  
  // 여기서는 RPC를 호출하는 방식을 시도합니다. 만약 RPC가 없다면 fallback으로 일부 데이터를 가져와 섞습니다.
  
  try {
    // RPC 시도 (미리 만들어두어야 함. 지금은 없으므로 fallback 방식 사용)
    // const { data, error } = await supabase.rpc('get_random_topic', { category_filter: category, difficulty_filter: difficulty });
    
    // Fallback: 임시로 100개를 가져와서 JS에서 랜덤 선택
    // (데이터가 많아지면 비효율적이지만 현재 규모에서는 충분함)
    const { data: topics, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({ error: 'No topics found' }, { status: 404 });
    }

    const randomIndex = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomIndex];

    return NextResponse.json(randomTopic);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
