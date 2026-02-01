import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authApiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import type { Battle } from '@/types/database';

// 대결방 참가
export const POST = authApiHandler(async ({ req, params, user, requestId }) => {
  const battleId = params?.id;

  if (!battleId) {
    logger.warn('Battle ID not provided for join', { requestId });
    return NextResponse.json({ error: '대결방 ID가 필요합니다.' }, { status: 400 });
  }

  const supabase = await createClient();

  logger.info('User attempting to join battle', { requestId, battleId, userId: user?.id });

  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body가 없어도 됨 (비밀번호 없는 방)
  }

  const { password } = body;

  // 대결방 정보 확인
  const { data: battleData, error: battleError } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  const battle = battleData as Battle | null;

  if (battleError || !battle) {
    logger.warn('Battle not found', { requestId, battleId, error: battleError });
    return NextResponse.json({ error: '대결방을 찾을 수 없습니다.' }, { status: 404 });
  }

  logger.debug('Battle found', { requestId, battleId, battleStatus: battle.status, isPrivate: battle.is_private });

  // 비밀번호 확인
  if (battle.is_private && battle.password !== password) {
    // 호스트인 경우 비밀번호 무시
    if (battle.host_id !== user?.id) {
      logger.warn('Invalid password attempt', { requestId, battleId, userId: user?.id });
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 403 });
    }
  }

  // 인원 제한 확인
  const { count, error: countError } = await supabase
    .from('battle_participants')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId);

  if (countError) {
    logger.error('Failed to count participants', countError, { requestId, battleId });
    return NextResponse.json({ error: '참가자 수 확인에 실패했습니다.' }, { status: 500 });
  }

  logger.debug('Participant count checked', { requestId, battleId, currentCount: count, maxParticipants: battle.max_participants });

  if (count !== null && count >= battle.max_participants) {
    logger.warn('Battle is full', { requestId, battleId, currentCount: count, maxParticipants: battle.max_participants });
    return NextResponse.json({ error: '대결방 인원이 가득 찼습니다.' }, { status: 400 });
  }

  // 이미 참가 중인지 확인
  const { data: existingParticipant } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .eq('user_id', user!.id)
    .single();

  if (existingParticipant) {
    logger.info('User already joined battle', { requestId, battleId, userId: user?.id });
    return NextResponse.json({ message: '이미 참가 중입니다.' }, { status: 200 });
  }

  // 참가 처리
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: joinError } = await (supabase
    .from('battle_participants') as any)
    .insert({
      battle_id: battleId,
      user_id: user!.id,
    });

  if (joinError) {
    logger.error('Failed to join battle', joinError, { requestId, battleId, userId: user?.id });
    return NextResponse.json({ error: '대결방 참가에 실패했습니다.', detail: joinError.message }, { status: 500 });
  }

  logger.info('User joined battle successfully', { requestId, battleId, userId: user?.id });
  return NextResponse.json({ success: true });
});
