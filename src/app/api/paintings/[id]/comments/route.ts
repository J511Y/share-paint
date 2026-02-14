import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ApiCommentArraySchema,
  ApiCommentSchema,
  CommentCreatePayloadSchema,
} from '@/lib/validation/schemas';
import { getUuidParam } from '@/lib/validation/params';

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
    .select(`
      *,
      profile:profiles(*)
    `)
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsedBody = CommentCreatePayloadSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        painting_id: paintingId,
        content: parsedBody.data.content,
      })
      .select(`
        *,
        profile:profiles(*)
      `)
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
