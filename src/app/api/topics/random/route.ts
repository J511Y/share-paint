import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiTopicSchema, TopicRandomQuerySchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = TopicRandomQuerySchema.safeParse({
    category: searchParams.get('category'),
    difficulty: searchParams.get('difficulty'),
  });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid topic query.' }, { status: 400 });
  }

  let query = supabase.from('topics').select('*');

  if (parsedQuery.data.category) {
    query = query.eq('category', parsedQuery.data.category);
  }

  if (parsedQuery.data.difficulty) {
    query = query.eq('difficulty', parsedQuery.data.difficulty);
  }

  try {
    const { data: topics, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: '주제 목록을 불러오지 못했습니다.' }, { status: 500 });
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({ error: '등록된 주제가 없습니다.' }, { status: 404 });
    }

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const parsedTopic = ApiTopicSchema.safeParse(randomTopic);
    if (!parsedTopic.success) {
      return NextResponse.json({ error: '주제 데이터 형식이 유효하지 않습니다.' }, { status: 500 });
    }

    return NextResponse.json(parsedTopic.data);
  } catch {
    return NextResponse.json({ error: '요청 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
