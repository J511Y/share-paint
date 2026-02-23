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
        <h1 className="text-2xl font-bold text-gray-900">피드</h1>
      </div>

      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent initialPaintings={paintings} />
      </Suspense>
    </div>
  );
}
