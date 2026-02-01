'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { uploadImage } from '@/lib/supabase/storage';
import { useAuth } from '@/hooks/useAuth';

interface SavePaintingModalProps {
  isOpen: boolean;
  onClose: () => void;
  getDataUrl: () => string | null;
  timeLimit?: number;
  actualTime?: number;
  initialTopic?: string;
}

export function SavePaintingModal({
  isOpen,
  onClose,
  getDataUrl,
  timeLimit = 0,
  actualTime = 0,
  initialTopic = '',
}: SavePaintingModalProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState(initialTopic);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTopic(initialTopic);
    }
  }, [isOpen, initialTopic]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    const dataUrl = getDataUrl();
    if (!dataUrl) {
      alert('저장할 그림이 없습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. 이미지 업로드
      const publicUrl = await uploadImage(dataUrl, 'paintings', user.id);
      
      if (!publicUrl) {
        throw new Error('이미지 업로드 실패');
      }

      // 2. DB 저장
      const res = await fetch('/api/paintings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: publicUrl,
          topic: topic || '자유 주제', // 입력 없으면 기본값
          time_limit: timeLimit,
          actual_time: actualTime,
        }),
      });

      if (!res.ok) {
        throw new Error('데이터베이스 저장 실패');
      }

      alert('그림이 성공적으로 저장되었습니다!');
      onClose();
      // TODO: 마이페이지나 피드로 이동?
    } catch (error) {
      console.error(error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">그림 저장하기</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className="flex justify-center bg-gray-100 rounded-lg p-4 mb-4">
            {/* 썸네일 미리보기 */}
            <img 
              src={getDataUrl() || ''} 
              alt="Preview" 
              className="max-h-48 object-contain shadow-sm bg-white" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작품 제목 (주제)
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 멋진 풍경, 자유 드로잉..."
              required
              maxLength={100}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  갤러리에 저장
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
