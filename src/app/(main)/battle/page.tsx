'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InfoDisclosure } from '@/components/ui/InfoDisclosure';
import { BattleConnectivityIndicator, BattleList, CreateBattleModal } from '@/components/battle';

export default function BattleLobbyPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대결방</h1>
            <p className="text-gray-600 mt-2">실시간 그림 대결에 빠르게 참가해보세요.</p>
          </div>
          <InfoDisclosure label="대결방 안내 보기" title="대결방 이용 안내">
            <ul className="list-disc space-y-1 pl-4">
              <li>게스트도 즉시 방 생성/참가가 가능합니다.</li>
              <li>요청이 과도하면 잠시 제한될 수 있습니다.</li>
              <li>접속 문제가 있으면 게스트 ID 재발급 후 다시 시도하세요.</li>
            </ul>
          </InfoDisclosure>
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:flex-nowrap">
          <BattleConnectivityIndicator />
          <Button onClick={() => setIsCreateModalOpen(true)} className="min-h-[40px] whitespace-nowrap">
            <Plus className="w-5 h-5 mr-1" />
            방 만들기
          </Button>
        </div>
      </div>

      <BattleList onCreateBattle={() => setIsCreateModalOpen(true)} />

      <CreateBattleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
