'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useActor } from '@/hooks/useActor';
import type { Comment } from '@/types/api-contracts';
import { ApiCommentSchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';
import { withGuestHeaders } from '@/lib/guest/client';

interface CommentFormProps {
  paintingId: string;
  onCommentAdded: (comment: Comment) => void;
}

export function CommentForm({ paintingId, onCommentAdded }: CommentFormProps) {
  const { actor } = useActor();
  const toast = useToast();
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !actor) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/paintings/${paintingId}/comments`,
        withGuestHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
      );

      if (!res.ok) throw new Error('Failed to post comment');

      const newComment = await parseJsonResponse(res, ApiCommentSchema);
      onCommentAdded(newComment);
      setContent('');
    } catch {
      toast.error('댓글 작성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="댓글을 입력하세요..."
        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        disabled={isLoading}
      />
      <Button
        type="submit"
        disabled={isLoading || !content.trim() || !actor}
        size="sm"
        leftIcon={isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      >
        등록
      </Button>
    </form>
  );
}
