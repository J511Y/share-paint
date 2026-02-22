import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiHandler, authApiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import type { BattleInsert } from '@/types/database';
import { hashBattlePassword } from '@/lib/security/battle-password';
import { apiErrorResponse } from '@/lib/api-error';
import {
  ApiBattleSchema,
  BattleArraySchema,
  BattleCreatePayloadSchema,
  type ApiBattle,
} from '@/lib/validation/schemas';

export const GET = apiHandler(async ({ req, requestId }) => {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const rawStatus = searchParams.get('status') || 'waiting';
  const statusResult = z.enum(['waiting', 'in_progress', 'finished']).safeParse(rawStatus);
  const status = statusResult.success ? statusResult.data : 'waiting';

  logger.debug('Fetching battles', { requestId, status });

  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      host:profiles!host_id(*),
      participants:battle_participants(count)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch battles', error, { requestId, status });
    return apiErrorResponse(500, 'INTERNAL_ERROR', '대전 목록 조회 중 오류가 발생했습니다.', requestId);
  }

  const parsed = BattleArraySchema.safeParse(data ?? []);
  if (!parsed.success) {
    logger.error('Failed to parse battle list response', {
      requestId,
      issues: parsed.error.issues,
      status,
    });
    return apiErrorResponse(500, 'INTERNAL_ERROR', '대전 목록 응답 형식이 올바르지 않습니다.', requestId);
  }

  logger.debug('Battles fetched successfully', { requestId, count: parsed.data.length });
  return NextResponse.json(parsed.data);
});

export const POST = authApiHandler(async ({ req, user, requestId }) => {
  const supabase = await createClient();

  logger.info('Creating battle room', { requestId, userId: user?.id });

  let payload;
  try {
    const body = await req.json();
    const parsedBody = BattleCreatePayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      logger.warn('Battle creation failed: invalid payload', {
        requestId,
        userId: user?.id,
        issues: parsedBody.error.issues,
      });
      return apiErrorResponse(400, 'VALIDATION_ERROR', '요청 바디가 유효하지 않습니다.', requestId, parsedBody.error.issues);
    }
    payload = parsedBody.data;
  } catch (parseError) {
    logger.error('Failed to parse request body', parseError, { requestId });
    return apiErrorResponse(400, 'BAD_REQUEST', '요청 형식을 파싱할 수 없습니다.', requestId);
  }

  if (payload.is_private && !payload.password) {
    logger.warn('Battle creation failed: missing password for private room', { requestId });
    return apiErrorResponse(400, 'VALIDATION_ERROR', '비공개 방 생성 시 비밀번호가 필요합니다.', requestId);
  }

  const battleData: BattleInsert = {
    host_id: user!.id,
    title: payload.title,
    time_limit: payload.time_limit,
    max_participants: payload.max_participants,
    is_private: payload.is_private,
    password_hash: payload.password ? hashBattlePassword(payload.password) : null,
    topic: payload.topic || null,
  };

  logger.debug('Battle data prepared', {
    requestId,
    battleData: { ...battleData, password_hash: '[REDACTED]' },
  });

  const { data: rawBattleResult, error: battleError } = await supabase
    .from('battles')
    .insert(battleData)
    .select()
    .single();

  if (battleError || !rawBattleResult) {
    logger.error('Failed to create battle', battleError, {
      requestId,
      userId: user?.id,
      battleData: { ...battleData, password_hash: '[REDACTED]' },
    });
    return apiErrorResponse(
      500,
      'INTERNAL_ERROR',
      '대전 생성 중 오류가 발생했습니다.',
      requestId,
      battleError?.message
    );
  }

  const battleResult = rawBattleResult as ApiBattle;
  const battleParsed = ApiBattleSchema.safeParse(battleResult);
  if (!battleParsed.success) {
    logger.error('Failed to parse battle create response', {
      requestId,
      issues: battleParsed.error.issues,
      battleId: battleResult.id,
    });
    return apiErrorResponse(500, 'INTERNAL_ERROR', '생성된 대전 데이터 형식이 유효하지 않습니다.', requestId);
  }

  logger.info('Battle created', { requestId, battleId: battleParsed.data.id });

  const { error: joinError } = await supabase
    .from('battle_participants')
    .insert({
      battle_id: battleParsed.data.id,
      user_id: user!.id,
    });

  if (joinError) {
    logger.error('Failed to add host as participant', joinError, {
      requestId,
      battleId: battleParsed.data.id,
      userId: user?.id,
    });

    await supabase.from('battles').delete().eq('id', battleParsed.data.id);
    logger.warn('Battle rolled back due to participant join failure', {
      requestId,
      battleId: battleParsed.data.id,
    });

    return apiErrorResponse(
      500,
      'INTERNAL_ERROR',
      '대전 참가자 등록 중 오류가 발생했습니다.',
      requestId,
      joinError.message
    );
  }

  logger.info('Battle creation completed successfully', { requestId, battleId: battleParsed.data.id, userId: user?.id });

  return NextResponse.json(battleParsed.data);
});
