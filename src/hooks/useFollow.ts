'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useFollow(targetUserId: string, initialIsFollowing: boolean) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const toggleFollow = useCallback(async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(!previousState);
    setIsLoading(true);

    try {
      const method = previousState ? 'DELETE' : 'POST';
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method,
      });

      if (!res.ok) {
        throw new Error('Failed to update follow status');
      }

      router.refresh(); // 서버 컴포넌트 데이터 갱신
    } catch (error) {
      console.error(error);
      setIsFollowing(previousState); // Revert on error
      alert('팔로우 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user, targetUserId, isFollowing, isLoading, router]);

  return { isFollowing, toggleFollow, isLoading };
}
