'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  ensureGuestIdentity,
  getGuestActorId,
  type GuestIdentity,
} from '@/lib/guest/client';

export interface ActorIdentity {
  id: string;
  userId: string | null;
  guestId: string | null;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest: boolean;
}

function toGuestActor(guestIdentity: GuestIdentity): ActorIdentity {
  const suffix = guestIdentity.guestId.slice(0, 6);

  return {
    id: getGuestActorId(guestIdentity.guestId),
    userId: null,
    guestId: guestIdentity.guestId,
    username: `guest-${suffix}`,
    displayName: guestIdentity.displayName,
    avatarUrl: null,
    isGuest: true,
  };
}

export function useActor() {
  const { user, isLoading } = useAuth();

  const guestIdentity = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return ensureGuestIdentity();
  }, []);

  const actor = useMemo<ActorIdentity | null>(() => {
    if (user) {
      return {
        id: user.id,
        userId: user.id,
        guestId: null,
        username: user.username,
        displayName: user.display_name || user.username,
        avatarUrl: user.avatar_url,
        isGuest: false,
      };
    }

    if (!guestIdentity) {
      return null;
    }

    return toGuestActor(guestIdentity);
  }, [user, guestIdentity]);

  return {
    actor,
    isLoading,
    isAuthenticatedUser: !!user,
    isGuest: !!actor?.isGuest,
    user,
  };
}
