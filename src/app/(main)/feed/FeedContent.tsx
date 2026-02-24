'use client';

import Link from 'next/link';
import { Palette, Swords } from 'lucide-react';
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
        <p className="mb-3 text-gray-600">
          첫 작품을 올리면 피드가 바로 살아나요. 먼저 그려서 공유해보세요!
        </p>
        <p className="mb-6 text-xs text-gray-500">
          빠르게 시작: 그림 그리기 → 저장 → 피드 반응 확인
        </p>

        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <Link
            href="/draw"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
          >
            그림 그리기 시작
          </Link>
          <Link
            href="/battle"
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Swords className="h-4 w-4" />
            대결방 둘러보기
          </Link>
        </div>
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

