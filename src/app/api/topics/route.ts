import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiTopicSchema, TopicCreatePayloadSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
