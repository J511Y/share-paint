import type { NextRequest } from 'next/server';
import type { createClient } from '@/lib/supabase/server';
import { getGuestActorId, getGuestIdentityFromRequest } from '@/lib/guest/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthUser = {
  id: string;
  email?: string;
} | null;

export interface ApiActor {
  kind: 'user' | 'guest';
  actorId: string;
  userId: string | null;
  guestId: string | null;
  displayName: string;
}

export async function resolveApiActor(
  request: NextRequest,
  supabase: ServerClient,
  fallbackUser?: AuthUser
): Promise<ApiActor | null> {
  const authUser =
    fallbackUser ??
    (
      await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    ).data.user;

  if (authUser?.id) {
    return {
      kind: 'user',
      actorId: authUser.id,
      userId: authUser.id,
      guestId: null,
      displayName: authUser.email || `user-${authUser.id.slice(0, 6)}`,
    };
  }

  const guestIdentity = getGuestIdentityFromRequest(request);
  if (!guestIdentity) {
    return null;
  }

  return {
    kind: 'guest',
    actorId: getGuestActorId(guestIdentity.guestId),
    userId: null,
    guestId: guestIdentity.guestId,
    displayName: guestIdentity.displayName,
  };
}
