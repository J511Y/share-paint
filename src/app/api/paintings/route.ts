import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  ApiPaintingArraySchema,
  ApiPaintingSchema,
  PaintingCreatePayloadSchema,
} from '@/lib/validation/schemas';
import type { PaintingInsert } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawBody = await request.json();
    const parsedBody = PaintingCreatePayloadSchema.safeParse({
      ...rawBody,
      user_id: user.id,
    });

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const paintingData: PaintingInsert = parsedBody.data;

    const { data, error } = await supabase
      .from('paintings')
      .insert(paintingData)
      .select(`
        *,
        profile:profiles(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsedPainting = ApiPaintingSchema.safeParse(data);
    if (!parsedPainting.success) {
      return NextResponse.json({ error: 'Invalid painting response payload.' }, { status: 500 });
    }

    return NextResponse.json(parsedPainting.data);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const battleId = searchParams.get('battleId');

  const parsedLimit = z.coerce.number().int().positive().max(100).default(20).safeParse(searchParams.get('limit'));
  const limit = parsedLimit.success ? parsedLimit.data : 20;

  if (userId) {
    const parsedUserId = z.string().uuid().safeParse(userId);
    if (!parsedUserId.success) {
      return NextResponse.json({ error: 'Invalid userId.' }, { status: 400 });
    }
  }

  if (battleId) {
    const parsedBattleId = z.string().uuid().safeParse(battleId);
    if (!parsedBattleId.success) {
      return NextResponse.json({ error: 'Invalid battleId.' }, { status: 400 });
    }
  }

  let query = supabase
    .from('paintings')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (battleId) {
    query = query.eq('battle_id', battleId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const parsedPaintings = ApiPaintingArraySchema.safeParse(data ?? []);
  if (!parsedPaintings.success) {
    return NextResponse.json({ error: 'Invalid paintings response payload.' }, { status: 500 });
  }

  return NextResponse.json(parsedPaintings.data);
}
