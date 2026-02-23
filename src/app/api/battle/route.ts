import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import type { BattleInsert, Database } from '@/types/database';
import { hashBattlePassword } from '@/lib/security/battle-password';
import {
  ApiBattleSchema,
  BattleArraySchema,
  BattleCreatePayloadSchema,
} from '@/lib/validation/schemas';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';

export const GET = apiHandler(async ({ req, requestId }) => {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const rawStatus = searchParams.get('status') || 'waiting';
  const statusResult = z.enum(['waiting', 'in_progress', 'finished']).safeParse(rawStatus);
  const status = statusResult.success ? statusResult.data : 'waiting';

  logger.debug('Fetching battles', { requestId, status });

  const { data, error } = await supabase
    .from('battles')
    .select(
      `
      *,
      host:profiles!host_id(*),
      participants:battle_participants(count)
    `
    )
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch battles', error, { requestId, status });
    return NextResponse.json({ error: '대전 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }

  const parsed = BattleArraySchema.safeParse(data ?? []);
  if (!parsed.success) {
    logger.error('Failed to parse battle list response', {
      requestId,
      issues: parsed.error.issues,
      status,
    });
    return NextResponse.json({ error: '대전 목록 응답 형식이 올바르지 않습니다.' }, { status: 500 });
  }

  logger.debug('Battles fetched successfully', { requestId, count: parsed.data.length });
  return NextResponse.json(parsed.data);
});

export const POST = apiHandler(async ({ req, requestId }) => {
  const supabase = await createClient();
  const actor = await resolveApiActor(req, supabase);

  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  const rateLimit = consumeRateLimit(`battle:create:${actor.actorId}`, 6, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: '대결방 생성이 너무 빠릅니다.' }, { status: 429 });
  }

  logger.info('Creating battle room', { requestId, actorId: actor.actorId });

  let payload;
  try {
    const body = await req.json();
    const parsedBody = BattleCreatePayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      logger.warn('Battle creation failed: invalid payload', {
        requestId,
        actorId: actor.actorId,
        issues: parsedBody.error.issues,
      });
      return NextResponse.json({ error: '요청 바디가 유효하지 않습니다.' }, { status: 400 });
    }
    payload = parsedBody.data;
  } catch (parseError) {
    logger.error('Failed to parse request body', parseError, { requestId });
    return NextResponse.json({ error: '요청 형식을 파싱할 수 없습니다.' }, { status: 400 });
  }

  if (payload.is_private && !payload.password) {
    logger.warn('Battle creation failed: missing password for private room', { requestId });
    return NextResponse.json({ error: '비공개 방 생성 시 비밀번호가 필요합니다.' }, { status: 400 });
  }

  const battleData = {
    host_id: actor.userId ?? undefined,
    host_guest_id: actor.guestId,
    host_guest_name: actor.userId ? null : actor.displayName,
    title: payload.title,
    time_limit: payload.time_limit,
    max_participants: payload.max_participants,
    is_private: payload.is_private,
    password_hash: payload.password ? hashBattlePassword(payload.password) : null,
    topic: payload.topic || null,
  } as BattleInsert;

  const { data: battleResult, error: battleError } = await supabase
    .from('battles')
    .insert(battleData)
    .select()
    .single();

  if (battleError || !battleResult) {
    logger.error('Failed to create battle', battleError, {
      requestId,
      actorId: actor.actorId,
    });
    return NextResponse.json(
      { error: '대전 생성 중 오류가 발생했습니다.', detail: battleError?.message },
      { status: 500 }
    );
  }

  const battleParsed = ApiBattleSchema.safeParse(battleResult);
  if (!battleParsed.success) {
    logger.error('Failed to parse battle create response', {
      requestId,
      issues: battleParsed.error.issues,
      battleId: battleResult.id,
    });
    return NextResponse.json({ error: '생성된 대전 데이터 형식이 유효하지 않습니다.' }, { status: 500 });
  }

  const participantInsert = {
    battle_id: battleParsed.data.id,
    user_id: actor.userId ?? undefined,
    guest_id: actor.guestId,
    guest_name: actor.userId ? null : actor.displayName,
  } as Database['public']['Tables']['battle_participants']['Insert'];

  const { error: joinError } = await supabase.from('battle_participants').insert(participantInsert);

  if (joinError) {
    logger.error('Failed to add host as participant', joinError, {
      requestId,
      battleId: battleParsed.data.id,
      actorId: actor.actorId,
    });

    await supabase.from('battles').delete().eq('id', battleParsed.data.id);

    return NextResponse.json(
      { error: '대전 참가자 등록 중 오류가 발생했습니다.', detail: joinError.message },
      { status: 500 }
    );
  }

  logger.info('Battle creation completed successfully', {
    requestId,
    battleId: battleParsed.data.id,
    actorId: actor.actorId,
  });

  return NextResponse.json(battleParsed.data);
});
