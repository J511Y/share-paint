import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatRelativeTime, formatTime } from '@/lib/utils';
import { Clock, Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { CommentList } from '@/components/comment';
import { PaintingCard } from '@/components/feed/PaintingCard'; // Reuse for consistency or build custom view? 
// Building custom view for detail page is better for larger image and layout.

export const metadata = {
  title: '그림 상세',
};

async function getPainting(id: string) {
  const supabase = await createClient();
  
  const { data: painting, error } = await supabase
    .from('paintings')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', id)
    .single();

  if (error || !painting) {
    return null;
  }

  return painting;
}

export default async function PaintingPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const painting = await getPainting(id);

  if (!painting) {
    notFound();
  }

  const profile = painting.profile;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/feed" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1" />
        피드로 돌아가기
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 왼쪽: 그림 이미지 */}
        <div className="md:col-span-2">
          <div className="bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-200">
            <img 
              src={painting.image_url} 
              alt={painting.topic}
              className="w-full h-auto object-contain max-h-[70vh] mx-auto"
            />
          </div>
          
          <div className="mt-6 flex items-center justify-between">
             <div>
               <h1 className="text-2xl font-bold text-gray-900 mb-2">{painting.topic}</h1>
               <div className="flex items-center gap-4 text-sm text-gray-500">
                 <span className="flex items-center gap-1">
                   <Clock className="w-4 h-4" />
                   {formatTime(painting.time_limit)} 제한
                 </span>
                 <span>
                   {formatRelativeTime(painting.created_at)}
                 </span>
               </div>
             </div>
             
             {/* 좋아요 버튼 등 추가 기능이 필요하면 여기에 Client Component 추가 */}
          </div>
        </div>

        {/* 오른쪽: 정보 및 댓글 */}
        <div className="space-y-6">
          {/* 작가 정보 */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">작가 정보</h3>
            <Link href={`/profile/${profile?.username ?? ''}`} className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-50">
                    {profile?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                  {profile?.display_name || profile?.username}
                </div>
                <div className="text-sm text-gray-500">@{profile?.username}</div>
              </div>
            </Link>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-1">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              댓글
            </h3>
            
            <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              <CommentList paintingId={painting.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
