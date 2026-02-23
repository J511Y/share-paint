'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useActor } from './useActor';
import { withGuestHeaders } from '@/lib/guest/client';

export function useFollow(targetUserId: string, initialIsFollowing: boolean) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const { actor } = useActor();
  const router = useRouter();

  const toggleFollow = useCallback(async () => {
    if (!actor) {
      alert('게스트 정보를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (isLoading) return;

    const previousState = isFollowing;
    setIsFollowing(!previousState);
    setIsLoading(true);

    try {
      const method = previousState ? 'DELETE' : 'POST';
      const res = await fetch(
        `/api/users/${targetUserId}/follow`,
        withGuestHeaders({ method })
      );

      if (!res.ok) {
        throw new Error('Failed to update follow status');
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setIsFollowing(previousState);
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [actor, targetUserId, isFollowing, isLoading, router]);

  return { isFollowing, toggleFollow, isLoading };
}
