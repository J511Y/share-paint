'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useActor } from './useActor';
import { withGuestHeaders } from '@/lib/guest/client';

export function useLike(paintingId: string, initialIsLiked: boolean, initialLikesCount: number) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);
  const { actor } = useActor();
  const router = useRouter();

  const toggleLike = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (!actor) {
        alert('게스트 정보를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      if (isLoading) return;

      const previousIsLiked = isLiked;
      const previousLikesCount = likesCount;

      setIsLiked(!previousIsLiked);
      setLikesCount(previousIsLiked ? previousLikesCount - 1 : previousLikesCount + 1);
      setIsLoading(true);

      try {
        const method = previousIsLiked ? 'DELETE' : 'POST';
        const res = await fetch(
          `/api/paintings/${paintingId}/like`,
          withGuestHeaders({ method })
        );

        if (!res.ok) {
          throw new Error('Failed to update like status');
        }

        router.refresh();
      } catch (error) {
        console.error(error);
        setIsLiked(previousIsLiked);
        setLikesCount(previousLikesCount);
        alert('좋아요 처리에 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [actor, paintingId, isLiked, likesCount, isLoading, router]
  );

  return { isLiked, likesCount, toggleLike, isLoading };
}
