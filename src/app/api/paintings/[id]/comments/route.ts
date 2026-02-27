import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiErrorResponse } from '@/lib/api-error';
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
import { rateLimitJson } from '@/lib/security/rate-limit-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid painting id.', requestId);
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
    return apiErrorResponse(500, 'INTERNAL_ERROR', '댓글 목록 조회 중 오류가 발생했습니다.', requestId);
  }

  const parsedComments = ApiCommentArraySchema.safeParse(comments ?? []);
  if (!parsedComments.success) {
    return apiErrorResponse(500, 'INTERNAL_ERROR', '댓글 응답 데이터 형식이 유효하지 않습니다.', requestId, parsedComments.error.issues);
  }

  return NextResponse.json(parsedComments.data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const resolvedParams = await params;
  const paintingId = getUuidParam(resolvedParams, 'id');
  if (!paintingId) {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid painting id.', requestId);
  }

  const supabase = await createClient();

  try {
    const actor = await resolveApiActor(request, supabase);
    if (!actor) {
      return apiErrorResponse(400, 'BAD_REQUEST', 'Guest identity is required.', requestId);
    }

    const parsedBody = CommentCreatePayloadSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid request body.', requestId, parsedBody.error.issues);
    }

    const rateLimit = consumeRateLimit(`painting:comment:${actor.actorId}`, 12, 60 * 1000);
    if (!rateLimit.allowed) {
      return rateLimitJson('댓글 작성이 너무 빠릅니다.', rateLimit.retryAfterMs);
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
      return apiErrorResponse(500, 'INTERNAL_ERROR', '댓글 작성 중 오류가 발생했습니다.', requestId);
    }

    const parsedComment = ApiCommentSchema.safeParse(comment);
    if (!parsedComment.success) {
      return apiErrorResponse(500, 'INTERNAL_ERROR', '댓글 응답 데이터 형식이 유효하지 않습니다.', requestId, parsedComment.error.issues);
    }

    return NextResponse.json(parsedComment.data);
  } catch {
    return apiErrorResponse(400, 'BAD_REQUEST', 'Invalid request', requestId);
  }
}
