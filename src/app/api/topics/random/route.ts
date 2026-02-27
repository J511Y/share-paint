import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
import { ApiTopicSchema, TopicRandomQuerySchema } from '@/lib/validation/schemas';

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const parsedQuery = TopicRandomQuerySchema.safeParse({
    category: searchParams.get('category') ?? undefined,
    difficulty: searchParams.get('difficulty') ?? undefined,
  });

  if (!parsedQuery.success) {
    return apiErrorResponse(400, 'VALIDATION_ERROR', '주제 조회 조건이 유효하지 않습니다.', requestId, parsedQuery.error.issues);
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
      return apiErrorResponse(500, 'INTERNAL_ERROR', '주제 목록을 불러오지 못했습니다.', requestId);
    }

    if (!topics || topics.length === 0) {
      return apiErrorResponse(404, 'NOT_FOUND', '등록된 주제가 없습니다.', requestId);
    }

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const parsedTopic = ApiTopicSchema.safeParse(randomTopic);
    if (!parsedTopic.success) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '주제 데이터 형식이 유효하지 않습니다.', requestId, parsedTopic.error.issues);
    }

    return NextResponse.json(parsedTopic.data);
  } catch {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '요청 처리 중 오류가 발생했습니다.', requestId);
  }
}
