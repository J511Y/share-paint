'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { CommentForm } from './CommentForm';
import type { Comment } from '@/types/api-contracts';
import { ApiCommentArraySchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';

interface CommentListProps {
  paintingId: string;
}

export function CommentList({ paintingId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await fetch(`/api/paintings/${paintingId}/comments`);
        if (res.ok) {
          const data = await parseJsonResponse(res, ApiCommentArraySchema);
          setComments(data);
        }
      } catch (error) {
        console.error('Failed to fetch comments', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [paintingId]);

  const handleCommentAdded = (newComment: Comment) => {
    setComments((prev) => [...prev, newComment]);
  };

  if (loading) {
    return <div className="py-4 text-center text-sm text-gray-500">댓글 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Link href={`/profile/${comment.profile?.username}`} className="shrink-0">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200">
                {comment.profile?.avatar_url ? (
                  <img
                    src={comment.profile.avatar_url}
                    alt={comment.profile.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-500">
                    {comment.profile?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${comment.profile?.username}`}
                  className="text-sm font-semibold text-gray-900 hover:underline"
                >
                  {comment.profile?.display_name || comment.profile?.username}
                </Link>
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">
            첫 번째 댓글을 남겨보세요!
          </div>
        )}
      </div>

      <CommentForm paintingId={paintingId} onCommentAdded={handleCommentAdded} />
    </div>
  );
}
