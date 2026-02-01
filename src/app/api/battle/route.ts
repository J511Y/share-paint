import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiHandler, authApiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import type { Battle, BattleInsert } from '@/types/database';

// 대결방 목록 조회
export const GET = apiHandler(async ({ req, requestId }) => {
  const supabase = await createClient();
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || 'waiting';

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
    return NextResponse.json({ error: '대결방 목록을 불러오는데 실패했습니다.' }, { status: 500 });
  }

  logger.debug('Battles fetched successfully', { requestId, count: data?.length });
  return NextResponse.json(data);
});

// 대결방 생성
export const POST = authApiHandler(async ({ req, user, requestId }) => {
  const supabase = await createClient();

  logger.info('Creating battle room', { requestId, userId: user?.id });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    logger.debug('Request body parsed', { requestId, body });
  } catch (parseError) {
    logger.error('Failed to parse request body', parseError, { requestId });
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const { title, time_limit, max_participants, is_private, password, topic } = body as {
    title?: string;
    time_limit?: string;
    max_participants?: string;
    is_private?: boolean;
    password?: string;
    topic?: string;
  };

  // 유효성 검사
  if (!title) {
    logger.warn('Battle creation failed: missing title', { requestId, userId: user?.id });
    return NextResponse.json({ error: '방 제목을 입력해주세요.' }, { status: 400 });
  }

  if (is_private && !password) {
    logger.warn('Battle creation failed: missing password for private room', { requestId });
    return NextResponse.json({ error: '비공개 방은 비밀번호가 필요합니다.' }, { status: 400 });
  }

  // 대결방 데이터 준비
  const battleData: BattleInsert = {
    host_id: user!.id,
    title: String(title),
    time_limit: time_limit ? parseInt(String(time_limit), 10) : 300,
    max_participants: max_participants ? parseInt(String(max_participants), 10) : 10,
    is_private: !!is_private,
    password: password ? String(password) : null,
    topic: topic ? String(topic) : null,
  };

  logger.debug('Battle data prepared', { requestId, battleData: { ...battleData, password: battleData.password ? '[REDACTED]' : null } });

  // 대결방 생성
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: battleResult, error: battleError } = await (supabase
    .from('battles') as any)
    .insert(battleData)
    .select()
    .single();

  const battle = battleResult as Battle | null;

  if (battleError || !battle) {
    logger.error('Failed to create battle', battleError, {
      requestId,
      userId: user?.id,
      battleData: { ...battleData, password: '[REDACTED]' },
    });
    return NextResponse.json({ error: '대결방 생성에 실패했습니다.', detail: battleError?.message }, { status: 500 });
  }

  logger.info('Battle created', { requestId, battleId: battle.id });

  // 호스트를 참가자로 자동 등록
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: joinError } = await (supabase
    .from('battle_participants') as any)
    .insert({
      battle_id: battle.id,
      user_id: user!.id,
    });

  if (joinError) {
    logger.error('Failed to add host as participant', joinError, {
      requestId,
      battleId: battle.id,
      userId: user?.id,
    });

    // 실패 시 대결방 삭제 (롤백)
    await supabase.from('battles').delete().eq('id', battle.id);
    logger.warn('Battle rolled back due to participant join failure', { requestId, battleId: battle.id });

    return NextResponse.json({ error: '대결방 참가 처리에 실패했습니다.', detail: joinError.message }, { status: 500 });
  }

  logger.info('Battle creation completed successfully', { requestId, battleId: battle.id, userId: user?.id });

  return NextResponse.json(battle);
});
