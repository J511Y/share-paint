'use client';

import Link from 'next/link';
import { Palette } from 'lucide-react';
import { PaintingCard } from '@/components/feed/PaintingCard';
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

