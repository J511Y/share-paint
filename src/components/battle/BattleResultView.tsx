'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Trophy, ThumbsUp, CheckCircle2, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SavePaintingModal } from '@/components/canvas/SavePaintingModal';
import type { BattleResult } from '@/types/battle';
import { cn } from '@/lib/utils';
import { useActor } from '@/hooks/useActor';

interface BattleResultProps {
  result: BattleResult;
  onVote: (userId: string) => void;
  hasVoted: boolean;
}

export function BattleResultView({ result, onVote, hasVoted }: BattleResultProps) {
  const { actor } = useActor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const handleVote = () => {
    if (selectedId) {
      onVote(selectedId);
    }
  };

  const myPainting = result.paintings.find((p) => p.userId === actor?.id);

  return (
    <div className="p-6 h-full overflow-y-auto relative">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {result.winner ? '대결 종료!' : '투표해주세요!'}
        </h2>
        <p className="text-gray-600 mt-1">
          {result.winner 
            ? '최다 득표 우승작이 선정되었습니다.' 
            : (hasVoted ? '투표가 완료되었습니다. 결과를 기다리는 중...' : '마음에 드는 작품을 선택하고 투표 버튼을 눌러주세요.')}
        </p>
      </div>

      {/* 우승자 표시 (결과 확정 시) */}
      {result.winner && (
        <div className="flex justify-center mb-12">
          <Card className="max-w-md w-full overflow-hidden border-2 border-yellow-400 shadow-xl transform hover:scale-105 transition-transform duration-300">
            <div className="aspect-[4/3] bg-gray-100 relative">
              <Image 
                src={result.winner.imageUrl} 
                alt={`Winner ${result.winner.username}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 500px"
              />
              <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1 z-10">
                <Trophy className="w-4 h-4" />
                1등
              </div>
            </div>
            <div className="p-4 bg-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{result.winner.username}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600 font-medium">
                  <ThumbsUp className="w-4 h-4" />
                  {result.winner.votes}표
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 모든 작품 그리드 */}
      <h3 className="text-xl font-semibold mb-4 text-gray-800">
        {result.winner ? '모든 작품' : '참가작 목록'}
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {result.paintings.map((painting) => {
          const isMe = actor?.id === painting.userId;
          // 투표 모드일 때는 선택 가능, 결과 모드일 때는 선택 불가
          const isSelectable = !result.winner && !hasVoted && !isMe;
          const isSelected = selectedId === painting.userId;
          
          return (
            <div 
              key={painting.userId}
              onClick={() => isSelectable && setSelectedId(painting.userId)}
              className={cn(
                "relative group rounded-xl overflow-hidden shadow-sm transition-all duration-200 border-2 bg-white",
                isSelected ? "border-primary-500 ring-2 ring-primary-200 scale-105" : "border-transparent",
                isSelectable && "hover:border-gray-300 cursor-pointer",
                result.winner && painting.userId !== result.winner.userId && "opacity-80 hover:opacity-100"
              )}
            >
              <div className="aspect-[4/3] bg-gray-100 relative">
                <Image 
                  src={painting.imageUrl} 
                  alt={painting.username}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {isMe && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-10">
                    <span className="bg-black/50 text-white px-2 py-1 rounded text-xs">내 그림</span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in z-10">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 truncate">{painting.username}</span>
                  {(result.winner || hasVoted) && (
                    <span className="text-sm text-gray-500">{painting.votes}표</span>
                  )}
                </div>
                
                {/* 내 그림인 경우 저장 버튼 표시 */}
                {isMe && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSaveModalOpen(true);
                    }}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    내 갤러리에 저장
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 투표 버튼 (투표 진행 중이고 아직 안 했을 때) */}
      {!result.winner && !hasVoted && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4 animate-in slide-in-from-bottom-4 pointer-events-none">
          <div className="pointer-events-auto shadow-2xl rounded-lg">
            <Button 
              size="lg" 
              className="min-w-[200px]"
              disabled={!selectedId}
              onClick={handleVote}
            >
              투표하기
            </Button>
          </div>
        </div>
      )}

      {/* 저장 모달 */}
      {myPainting && (
        <SavePaintingModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          getDataUrl={() => myPainting.imageUrl}
          initialTopic="대결 그림"
        />
      )}
    </div>
  );
}
