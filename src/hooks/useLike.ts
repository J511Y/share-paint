'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useLike(paintingId: string, initialIsLiked: boolean, initialLikesCount: number) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const toggleLike = useCallback(async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    setIsLiked(!previousIsLiked);
    setLikesCount(previousIsLiked ? previousLikesCount - 1 : previousLikesCount + 1);
    setIsLoading(true);

    try {
      const method = previousIsLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/paintings/${paintingId}/like`, {
        method,
      });

      if (!res.ok) {
        throw new Error('Failed to update like status');
      }

      router.refresh(); // 서버 데이터 갱신
    } catch (error) {
      console.error(error);
      // Revert on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);
      alert('좋아요 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user, paintingId, isLiked, likesCount, isLoading, router]);

  return { isLiked, likesCount, toggleLike, isLoading };
}
