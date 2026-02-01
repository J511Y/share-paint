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

  try {
    const { data: topics, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: '주제를 불러오는데 실패했습니다.' }, { status: 500 });
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({ error: '등록된 주제가 없습니다.' }, { status: 404 });
    }

    const randomIndex = Math.floor(Math.random() * topics.length);
    const randomTopic = topics[randomIndex];

    return NextResponse.json(randomTopic);
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
