'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, Users, Clock, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { ApiBattleSchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';
import { withGuestHeaders } from '@/lib/guest/client';

interface CreateBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateBattleModal({ isOpen, onClose }: CreateBattleModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    time_limit: '300', // 5분
    max_participants: '8',
    is_private: false,
    password: '',
    topic: '', // 선택 사항, 비워두면 랜덤
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(
        '/api/battle',
        withGuestHeaders({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      );

      if (!res.ok) throw new Error('Failed to create battle');

      const battle = await parseJsonResponse(res, ApiBattleSchema);
      router.push(`/battle/${battle.id}`);
    } catch {
      toast.error('대결방 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">대결방 만들기</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              방 제목
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="같이 그림 그리실 분!"
              required
              maxLength={50}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>제한 시간</span>
                </div>
              </label>
              <select
                value={formData.time_limit}
                onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="60">1분</option>
                <option value="180">3분</option>
                <option value="300">5분</option>
                <option value="600">10분</option>
                <option value="0">무제한</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>최대 인원</span>
                </div>
              </label>
              <select
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="2">2명</option>
                <option value="4">4명</option>
                <option value="8">8명</option>
                <option value="10">10명</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-1">
                <Palette className="w-3.5 h-3.5" />
                <span>주제 (선택)</span>
              </div>
            </label>
            <Input
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="비워두면 랜덤 주제"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_private}
                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                비공개 방
              </span>
            </label>
          </div>

          {formData.is_private && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="비밀번호 입력"
                required={formData.is_private}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '생성 중...' : '만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
