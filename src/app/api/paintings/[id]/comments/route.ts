import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import {
  ApiCommentArraySchema,
  ApiCommentSchema,
  CommentCreatePayloadSchema,
} from '@/lib/validation/schemas';
import { getUuidParam } from '@/lib/validation/params';
import { resolveApiActor } from '@/lib/api-actor';
import {
  consumeDuplicateContentGuard,
  consumeRateLimit,
} from '@/lib/security/action-rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return NextResponse.json({ error: 'Invalid painting id.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: comments, error } = await supabase
    .from('comments')
    .select(
      `
      *,
      profile:profiles(*)
    `
    )
    .eq('painting_id', paintingId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedComments = ApiCommentArraySchema.safeParse(comments ?? []);
  if (!parsedComments.success) {
    return NextResponse.json({ error: 'Invalid comments response payload.' }, { status: 500 });
  }

  return NextResponse.json(parsedComments.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return NextResponse.json({ error: 'Invalid painting id.' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const actor = await resolveApiActor(request, supabase);
    if (!actor) {
      return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
    }

    const parsedBody = CommentCreatePayloadSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const rateLimit = consumeRateLimit(`painting:comment:${actor.actorId}`, 12, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: '댓글 작성이 너무 빠릅니다.' }, { status: 429 });
    }

    const duplicateGuard = consumeDuplicateContentGuard(
      `painting:comment:dup:${actor.actorId}`,
      parsedBody.data.content,
      30 * 1000
    );

    if (!duplicateGuard.allowed) {
      return NextResponse.json(
        { error: '같은 댓글을 너무 자주 반복하고 있습니다.' },
        { status: 429 }
      );
    }

    const commentInsert = {
      user_id: actor.userId ?? undefined,
      guest_id: actor.guestId,
      guest_name: actor.userId ? null : actor.displayName,
      painting_id: paintingId,
      content: parsedBody.data.content,
    } as Database['public']['Tables']['comments']['Insert'];

    const { data: comment, error } = await supabase
      .from('comments')
      .insert(commentInsert)
      .select(
        `
        *,
        profile:profiles(*)
      `
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsedComment = ApiCommentSchema.safeParse(comment);
    if (!parsedComment.success) {
      return NextResponse.json({ error: 'Invalid comment response payload.' }, { status: 500 });
    }

    return NextResponse.json(parsedComment.data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
