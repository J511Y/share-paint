import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import { hashBattlePassword, verifyBattlePassword } from '@/lib/security/battle-password';
import { BattleJoinPayloadSchema } from '@/lib/validation/schemas';
import { getUuidParam } from '@/lib/validation/params';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import { apiErrorResponse, createApiError } from '@/lib/api-error';
import type { Database } from '@/types/database';
import {
  isRlsOrPermissionError,
  isUniqueViolation,
  toErrorDetails,
} from '@/lib/supabase/errors';
import { resolveWriteClient } from '@/lib/supabase/write-client';

function rateLimitedResponse(message: string, retryAfterMs: number, requestId: string) {
  const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    createApiError('RATE_LIMITED', message, requestId, { retryAfterMs }),
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  );
}

export const POST = apiHandler(async ({ req, params, requestId }) => {
  const battleId = getUuidParam(params, 'id');

  if (!battleId) {
    logger.warn('Battle ID not provided for join', { requestId });
    return apiErrorResponse(400, 'BAD_REQUEST', '대결방 ID가 필요합니다.', requestId);
  }

  const supabase = await createClient();
  const writeClient = resolveWriteClient(supabase);
  const actor = await resolveApiActor(req, supabase);

  if (!actor) {
    return apiErrorResponse(400, 'BAD_REQUEST', '게스트 식별 정보가 필요합니다.', requestId);
  }

  const rateLimit = consumeRateLimit(`battle:join:${actor.actorId}:${battleId}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return rateLimitedResponse('입장 요청이 너무 빠릅니다.', rateLimit.retryAfterMs, requestId);
  }

  let password = '';
  try {
    const body = await req.json();
    const parsedBody = BattleJoinPayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return apiErrorResponse(400, 'VALIDATION_ERROR', '요청 바디가 유효하지 않습니다.', requestId, parsedBody.error.issues);
    }
    password = parsedBody.data.password ?? '';
  } catch {
    // empty body is allowed for public battles
  }

  const { data: battleData, error: battleError } = await writeClient
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (battleError || !battleData) {
    logger.warn('Battle not found', { requestId, battleId, error: battleError });
    return apiErrorResponse(404, 'NOT_FOUND', '대결방을 찾을 수 없습니다.', requestId);
  }

  const battle = battleData;

  if (battle.is_private) {
    const passwordMatch =
      verifyBattlePassword(password, battle.password_hash ?? null) ||
      (!!password && !!battle.password && battle.password === password);

    const isHost =
      (actor.userId && battle.host_id === actor.userId) ||
      (actor.guestId && battle.host_guest_id === actor.guestId);

    if (!passwordMatch && !isHost) {
      return apiErrorResponse(403, 'INVALID_PASSWORD', '비밀번호가 일치하지 않습니다.', requestId);
    }

    if (passwordMatch && !battle.password_hash && !!battle.password && !!password) {
      writeClient
        .from('battles')
        .update({
          password_hash: hashBattlePassword(password),
          password: null,
        })
        .eq('id', battleId)
        .then((result: { error: { message?: string } | null }) => {
          if (result.error) {
            logger.warn('Failed to migrate battle password hash', {
              requestId,
              battleId,
              error: result.error.message,
            });
          }
        });
    }
  }

  let existingQuery = writeClient
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .limit(1);

  if (actor.userId) {
    existingQuery = existingQuery.eq('user_id', actor.userId);
  } else if (actor.guestId) {
    existingQuery = existingQuery.eq('guest_id', actor.guestId);
  }

  const { data: existingParticipants } = await existingQuery;

  if (existingParticipants && existingParticipants.length > 0) {
    return NextResponse.json({ success: true, alreadyJoined: true }, { status: 200 });
  }

  const { count, error: countError } = await writeClient
    .from('battle_participants')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId);

  if (countError) {
    logger.error('Failed to count participants', countError, { requestId, battleId });
    return apiErrorResponse(500, 'INTERNAL_ERROR', '참가자 수 검증 중 오류가 발생했습니다.', requestId, toErrorDetails(countError));
  }

  if (count !== null && count >= battle.max_participants) {
    return apiErrorResponse(409, 'ROOM_FULL', '대결방 인원이 가득 찼습니다.', requestId);
  }

  const participantInsert = {
    battle_id: battleId,
    user_id: actor.userId ?? undefined,
    guest_id: actor.guestId,
    guest_name: actor.userId ? null : actor.displayName,
  } as Database['public']['Tables']['battle_participants']['Insert'];

  const { error: joinError } = await writeClient.from('battle_participants').insert(participantInsert);

  if (joinError) {
    if (isUniqueViolation(joinError)) {
      return NextResponse.json({ success: true, alreadyJoined: true }, { status: 200 });
    }

    logger.error('Failed to join battle', joinError, {
      requestId,
      battleId,
      actorId: actor.actorId,
    });

    if (isRlsOrPermissionError(joinError)) {
      return apiErrorResponse(403, 'FORBIDDEN', '대결방 참가 권한이 없습니다.', requestId, toErrorDetails(joinError));
    }

    return apiErrorResponse(500, 'INTERNAL_ERROR', '대결방 참가 중 오류가 발생했습니다.', requestId, toErrorDetails(joinError));
  }

  return NextResponse.json({ success: true });
});
