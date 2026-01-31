'use client';

import Link from 'next/link';
import { Heart, MessageCircle, Palette, Clock } from 'lucide-react';
import { Card } from '@/components/ui';
import { formatRelativeTime, formatTime } from '@/lib/utils';
import type { Painting, Profile } from '@/types/database';

interface PaintingWithProfile extends Omit<Painting, 'profile'> {
  profile: Profile | null;
}

interface FeedContentProps {
  initialPaintings: PaintingWithProfile[];
}

export function FeedContent({ initialPaintings }: FeedContentProps) {
  if (initialPaintings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 text-6xl">
          <Palette className="h-16 w-16 text-purple-600" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          아직 그림이 없어요
        </h2>
        <p className="mb-6 text-gray-600">
          첫 번째 그림을 그려서 공유해보세요!
        </p>
        <Link
          href="/draw"
          className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          그림 그리기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {initialPaintings.map((painting) => (
        <PaintingCard key={painting.id} painting={painting} />
      ))}
    </div>
  );
}

function PaintingCard({ painting }: { painting: PaintingWithProfile }) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* 이미지 */}
      <div className="aspect-square bg-gray-100">
        <img
          src={painting.image_url}
          alt={painting.topic}
          className="h-full w-full object-cover"
        />
      </div>

      {/* 정보 */}
      <div className="p-4">
        {/* 주제 및 시간 */}
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
            {painting.topic}
          </span>
          <span className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(painting.time_limit)}
          </span>
        </div>

        {/* 작성자 */}
        {painting.profile && (
          <Link
            href={`/profile/${painting.profile.username}`}
            className="mb-3 flex items-center gap-2 hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600">
              {painting.profile.display_name?.[0] ||
                painting.profile.username[0].toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-900">
              {painting.profile.display_name || painting.profile.username}
            </span>
          </Link>
        )}

        {/* 통계 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {painting.likes_count}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {painting.comments_count}
            </span>
          </div>
          <span>{formatRelativeTime(painting.created_at)}</span>
        </div>
      </div>
    </Card>
  );
}
