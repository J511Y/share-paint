import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authApiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import { hashBattlePassword, verifyBattlePassword } from '@/lib/security/battle-password';
import { apiErrorResponse } from '@/lib/api-error';
import { BattleJoinPayloadSchema } from '@/lib/validation/schemas';
import { getUuidParam } from '@/lib/validation/params';
import type { Battle } from '@/types/database';

export const POST = authApiHandler(async ({ req, params, user, requestId }) => {
  const battleId = getUuidParam(params, 'id');

  if (!battleId) {
    logger.warn('Battle ID not provided for join', { requestId });
    return apiErrorResponse(400, 'BAD_REQUEST', 'Battle ID is required.', requestId);
  }

  const supabase = await createClient();

  logger.info('User attempting to join battle', { requestId, battleId, userId: user?.id });

  let password = '';
  try {
    const body = await req.json();
    const parsedBody = BattleJoinPayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid request body.', requestId, parsedBody.error.issues);
    }
    password = parsedBody.data.password ?? '';
  } catch {
    // empty body is allowed for public battles
  }

  const { data: battleData, error: battleError } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (battleError || !battleData) {
    logger.warn('Battle not found', { requestId, battleId, error: battleError });
    return apiErrorResponse(404, 'NOT_FOUND', 'Battle not found.', requestId);
  }

  const battle = battleData as Battle;

  logger.debug('Battle found', { requestId, battleId, battleStatus: battle.status, isPrivate: battle.is_private });

  if (battle.is_private) {
    const passwordMatch =
      verifyBattlePassword(password, battle.password_hash ?? null) ||
      (!!password && !!battle.password && battle.password === password);

    if (!passwordMatch) {
      if (battle.host_id !== user?.id) {
        logger.warn('Invalid password attempt', { requestId, battleId, userId: user?.id });
        return apiErrorResponse(403, 'INVALID_PASSWORD', '비밀번호가 일치하지 않습니다.', requestId);
      }
    } else if (!battle.password_hash && !!battle.password && !!password) {
      supabase
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
  } else if (battle.password) {
    logger.warn('Unexpected legacy password on public battle', { requestId, battleId });
  }

  const { count, error: countError } = await supabase
    .from('battle_participants')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId);

  if (countError) {
    logger.error('Failed to count participants', countError, { requestId, battleId });
    return apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to validate participant count.', requestId);
  }

  logger.debug('Participant count checked', {
    requestId,
    battleId,
    currentCount: count,
    maxParticipants: battle.max_participants,
  });

  if (count !== null && count >= battle.max_participants) {
    logger.warn('Battle is full', { requestId, battleId, currentCount: count, maxParticipants: battle.max_participants });
    return apiErrorResponse(409, 'ROOM_FULL', 'Battle participant limit reached.', requestId);
  }

  const { data: existingParticipant } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .eq('user_id', user!.id)
    .single();

  if (existingParticipant) {
    logger.info('User already joined battle', { requestId, battleId, userId: user?.id });
    return NextResponse.json({ message: 'Already joined.' }, { status: 200 });
  }

  const { error: joinError } = await supabase
    .from('battle_participants')
    .insert({
      battle_id: battleId,
      user_id: user!.id,
    });

  if (joinError) {
    logger.error('Failed to join battle', joinError, { requestId, battleId, userId: user?.id });
    return apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to join battle.', requestId, joinError.message);
  }

  logger.info('User joined battle successfully', { requestId, battleId, userId: user?.id });
  return NextResponse.json({ success: true });
});
