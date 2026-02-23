import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import { hashBattlePassword, verifyBattlePassword } from '@/lib/security/battle-password';
import { BattleJoinPayloadSchema } from '@/lib/validation/schemas';
import { getUuidParam } from '@/lib/validation/params';
import { resolveApiActor } from '@/lib/api-actor';
import { consumeRateLimit } from '@/lib/security/action-rate-limit';
import type { Database } from '@/types/database';

function resolveBattleJoinWriteClient(isGuestActor: boolean, requestId: string) {
  if (!isGuestActor) {
    return null;
  }

  try {
    return createAdminClient();
  } catch (error) {
    logger.warn('Guest battle join write client fallback to anon client', {
      requestId,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const POST = apiHandler(async ({ req, params, requestId }) => {
  const battleId = getUuidParam(params, 'id');

  if (!battleId) {
    logger.warn('Battle ID not provided for join', { requestId });
    return NextResponse.json({ error: 'Battle ID is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const actor = await resolveApiActor(req, supabase);

  if (!actor) {
    return NextResponse.json({ error: 'Guest identity is required.' }, { status: 400 });
  }

  const writeClient = resolveBattleJoinWriteClient(actor.kind === 'guest', requestId) ?? supabase;

  const rateLimit = consumeRateLimit(`battle:join:${actor.actorId}:${battleId}`, 20, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: '입장 요청이 너무 빠릅니다.' }, { status: 429 });
  }

  let password = '';
  try {
    const body = await req.json();
    const parsedBody = BattleJoinPayloadSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Battle not found.' }, { status: 404 });
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
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
    }

    if (passwordMatch && !battle.password_hash && !!battle.password && !!password) {
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
  }

  const { count, error: countError } = await supabase
    .from('battle_participants')
    .select('*', { count: 'exact', head: true })
    .eq('battle_id', battleId);

  if (countError) {
    logger.error('Failed to count participants', countError, { requestId, battleId });
    return NextResponse.json({ error: 'Failed to validate participant count.' }, { status: 500 });
  }

  if (count !== null && count >= battle.max_participants) {
    return NextResponse.json({ error: 'Battle participant limit reached.' }, { status: 400 });
  }

  let existingQuery = supabase
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
    return NextResponse.json({ message: 'Already joined.' }, { status: 200 });
  }

  const participantInsert = {
    battle_id: battleId,
    user_id: actor.userId ?? undefined,
    guest_id: actor.guestId,
    guest_name: actor.userId ? null : actor.displayName,
  } as Database['public']['Tables']['battle_participants']['Insert'];

  const { error: joinError } = await writeClient.from('battle_participants').insert(participantInsert);

  if (joinError) {
    logger.error('Failed to join battle', joinError, {
      requestId,
      battleId,
      actorId: actor.actorId,
    });
    return NextResponse.json({ error: 'Failed to join battle.', detail: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
