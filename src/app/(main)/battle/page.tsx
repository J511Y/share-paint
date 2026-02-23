'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BattleList, CreateBattleModal } from '@/components/battle';

export default function BattleLobbyPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대결방</h1>
          <p className="text-gray-600 mt-2">
            다른 작가들과 실시간으로 그림 대결을 펼쳐보세요!
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            게스트도 즉시 방 생성/참가가 가능합니다. 과도한 요청은 자동으로 잠시 제한됩니다.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-5 h-5 mr-1" />
          방 만들기
        </Button>
      </div>

      <BattleList onCreateBattle={() => setIsCreateModalOpen(true)} />

      <CreateBattleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
