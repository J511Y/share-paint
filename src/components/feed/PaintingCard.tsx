'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, MessageCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatRelativeTime, formatTime } from '@/lib/utils';
import type { Painting, Profile } from '@/types/database';
import { useLike } from '@/hooks/useLike';
import { cn } from '@/lib/utils';

interface PaintingWithProfile extends Omit<Painting, 'profile'> {
  profile: Profile | null;
  isLiked?: boolean;
}

interface PaintingCardProps {
  painting: PaintingWithProfile;
}

export function PaintingCard({ painting }: PaintingCardProps) {
  const { isLiked, likesCount, toggleLike } = useLike(
    painting.id,
    painting.isLiked || false,
    painting.likes_count
  );

  const fallbackName = painting.guest_name || '게스트 작가';
  const fallbackInitial = fallbackName[0]?.toUpperCase() || 'G';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md h-full flex flex-col">
      {/* 이미지 - 클릭 시 상세 페이지(모달)로 이동 가능하도록 Link 래핑 고려 */}
      <Link href={`/painting/${painting.id}`} className="block relative aspect-square bg-gray-100 overflow-hidden group">
        <Image
          src={painting.image_url}
          alt={painting.topic}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* 오버레이 (옵션) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </Link>

      {/* 정보 */}
      <div className="p-4 flex-1 flex flex-col">
        {/* 주제 및 시간 */}
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 truncate max-w-[150px]">
            {painting.topic}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
            <Clock className="h-3 w-3" />
            {formatTime(painting.time_limit)}
          </span>
        </div>

        {/* 작성자 */}
        {painting.profile ? (
          <Link
            href={`/profile/${painting.profile.username}`}
            className="mb-3 flex items-center gap-2 hover:opacity-80 w-fit"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-600 overflow-hidden relative">
              {painting.profile.avatar_url ? (
                <Image
                  src={painting.profile.avatar_url}
                  alt={painting.profile.username}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              ) : (
                painting.profile.display_name?.[0] || painting.profile.username[0].toUpperCase()
              )}
            </div>
            <span className="text-sm font-medium text-gray-900 truncate">
              {painting.profile.display_name || painting.profile.username}
            </span>
          </Link>
        ) : (
          <div className="mb-3 flex items-center gap-2 w-fit">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              {fallbackInitial}
            </div>
            <span className="text-sm font-medium text-gray-700 truncate">{fallbackName}</span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLike}
              className={cn(
                "flex items-center gap-1 transition-colors hover:text-pink-500",
                isLiked ? "text-pink-500" : "text-gray-500"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              {likesCount}
            </button>
            <Link href={`/painting/${painting.id}`} className="flex items-center gap-1 hover:text-purple-600 transition-colors">
              <MessageCircle className="h-4 w-4" />
              {painting.comments_count}
            </Link>
          </div>
          <span className="text-xs">{formatRelativeTime(painting.created_at)}</span>
        </div>
      </div>
    </Card>
  );
}
