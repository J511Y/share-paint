import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
import { ApiTopicSchema, TopicCreatePayloadSchema } from '@/lib/validation/schemas';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return apiErrorResponse(400, 'BAD_REQUEST', '게스트 식별 정보가 필요합니다.', requestId);
  }

  const rateLimit = consumeRateLimit(`topic:create:${actor.actorId}`, 4, 60 * 1000);
  if (!rateLimit.allowed) {
    return rateLimitJson('주제 생성 요청이 너무 빠릅니다.', rateLimit.retryAfterMs);
  }

  try {
    const rawBody = await request.json();
    const parsedBody = TopicCreatePayloadSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return apiErrorResponse(400, 'VALIDATION_ERROR', '요청 바디가 유효하지 않습니다.', requestId, parsedBody.error.issues);
    }

    const { data: topic, error } = await supabase
      .from('topics')
      .insert({
        content: parsedBody.data.content,
        category: parsedBody.data.category,
        difficulty: parsedBody.data.difficulty,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '주제 생성 중 오류가 발생했습니다.', requestId);
    }

    const parsedTopic = ApiTopicSchema.safeParse(topic);
    if (!parsedTopic.success) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '주제 응답 데이터 형식이 유효하지 않습니다.', requestId, parsedTopic.error.issues);
    }

    return NextResponse.json(parsedTopic.data);
  } catch {
    return apiErrorResponse(400, 'BAD_REQUEST', '요청 형식을 파싱할 수 없습니다.', requestId);
  }
}
