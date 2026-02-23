import Link from 'next/link';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import { FeedContent } from './FeedContent';
import { FeedSkeleton } from './FeedSkeleton';

export const metadata = {
  title: '피드',
  description: '다른 사용자들의 그림을 구경해보세요',
};

export async function getFeedPaintings() {
  if (!getSupabasePublicEnv()) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data: paintings, error } = await supabase
      .from('paintings')
      .select(`
      *,
      profile:profiles(id, username, display_name, avatar_url)
    `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching paintings:', error);
      return [];
    }

    return paintings;
  } catch (error) {
    console.error('Error creating Supabase server client for feed:', error);
    return [];
  }
}

export default async function FeedPage() {
  const paintings = await getFeedPaintings();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">피드</h1>
          <p className="mt-1 text-xs text-emerald-700">
            게스트로도 피드 탐색/좋아요/댓글 참여가 가능합니다. 문제가 있으면 상단에서 게스트 ID를 재발급하세요.
          </p>
        </div>
        <Link href="/login" className="text-xs text-gray-500 hover:text-gray-700">
          계정 연결 (선택)
        </Link>
      </div>

      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent initialPaintings={paintings} />
      </Suspense>
    </div>
  );
}
