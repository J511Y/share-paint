import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiTopicSchema, TopicCreatePayloadSchema } from '@/lib/validation/schemas';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const actor = await resolveApiActor(request, supabase);
  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  const rateLimit = consumeRateLimit(`topic:create:${actor.actorId}`, 4, 60 * 1000);
  if (!rateLimit.allowed) {
    return rateLimitJson('주제 생성 요청이 너무 빠릅니다.', rateLimit.retryAfterMs);
  }

  try {
    const rawBody = await request.json();
    const parsedBody = TopicCreatePayloadSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsedTopic = ApiTopicSchema.safeParse(topic);
    if (!parsedTopic.success) {
      return NextResponse.json({ error: 'Invalid topic response payload.' }, { status: 500 });
    }

    return NextResponse.json(parsedTopic.data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
