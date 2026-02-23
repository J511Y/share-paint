import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiHandler } from '@/lib/api-handler';
import { devLogger as logger } from '@/lib/logger';
import { apiErrorResponse } from '@/lib/api-error';

// 대결방 상세 조회
export const GET = apiHandler(async ({ params, requestId }) => {
  const id = params?.id;

  if (!id) {
    logger.warn('Battle ID not provided', { requestId });
    return apiErrorResponse(400, 'BAD_REQUEST', '대결방 ID가 필요합니다.', requestId);
  }

  const supabase = await createClient();

  logger.debug('Fetching battle details', { requestId, battleId: id });

  const { data, error } = await supabase
    .from('battles')
    .select(`
      *,
      host:profiles!host_id(*),
      participants:battle_participants(
        *,
        profile:profiles(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    logger.error('Failed to fetch battle', error, { requestId, battleId: id });
    return apiErrorResponse(404, 'NOT_FOUND', '대결방을 찾을 수 없습니다.', requestId);
  }

  logger.debug('Battle fetched successfully', { requestId, battleId: id });
  return NextResponse.json(data);
});
