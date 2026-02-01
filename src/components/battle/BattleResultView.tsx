'use client';

import { useState } from 'react';
import { Trophy, ThumbsUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { BattleResult, BattlePainting } from '@/types/battle';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface BattleResultProps {
  result: BattleResult;
  onVote: (userId: string) => void;
  hasVoted: boolean;
}

export function BattleResultView({ result, onVote, hasVoted }: BattleResultProps) {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleVote = () => {
    if (selectedId) {
      onVote(selectedId);
    }
  };

  // 투표 결과가 확정된 경우 (winner가 있는 경우)
  if (result.winner) {
    return (
      <div className="flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
        <div className="mb-8 text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900">대결 종료!</h2>
          <p className="text-gray-600 mt-2">최다 득표 우승작입니다</p>
        </div>

        <Card className="max-w-md w-full overflow-hidden border-2 border-yellow-400 shadow-xl transform hover:scale-105 transition-transform duration-300">
          <div className="aspect-[4/3] bg-gray-100 relative">
            <img 
              src={result.winner.imageUrl} 
              alt={`Winner ${result.winner.username}`}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
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

        <div className="mt-12 w-full max-w-4xl">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">모든 작품</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.paintings
              .filter(p => p.userId !== result.winner?.userId)
              .map((painting) => (
                <div key={painting.userId} className="bg-white rounded-lg shadow overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                  <div className="aspect-[4/3] bg-gray-100">
                    <img 
                      src={painting.imageUrl} 
                      alt={painting.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-sm flex justify-between items-center">
                    <span className="font-medium truncate">{painting.username}</span>
                    <span className="text-gray-500 text-xs">{painting.votes}표</span>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 투표 진행 중
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">투표해주세요!</h2>
        <p className="text-gray-600 mt-1">
          {hasVoted ? '투표가 완료되었습니다. 결과를 기다리는 중...' : '마음에 드는 작품을 선택하고 투표 버튼을 눌러주세요.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
        {result.paintings.map((painting) => {
          const isMe = user?.id === painting.userId;
          const isSelected = selectedId === painting.userId;
          
          return (
            <div 
              key={painting.userId}
              onClick={() => !hasVoted && !isMe && setSelectedId(painting.userId)}
              className={cn(
                "relative group rounded-xl overflow-hidden shadow-sm transition-all duration-200 border-2",
                isSelected ? "border-primary-500 ring-2 ring-primary-200 scale-105" : "border-transparent hover:border-gray-300",
                isMe ? "cursor-default opacity-80" : (hasVoted ? "cursor-default" : "cursor-pointer")
              )}
            >
              <div className="aspect-[4/3] bg-gray-100 relative">
                <img 
                  src={painting.imageUrl} 
                  alt={painting.username}
                  className="w-full h-full object-contain"
                />
                {isMe && (
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                    <span className="bg-black/50 text-white px-2 py-1 rounded text-xs">내 그림</span>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary-500 text-white p-1 rounded-full shadow-lg animate-in zoom-in">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-white">
                <div className="font-medium text-gray-900 truncate">{painting.username}</div>
              </div>
            </div>
          );
        })}
      </div>

      {!hasVoted && (
        <div className="fixed bottom-8 left-0 right-0 flex justify-center px-4 animate-in slide-in-from-bottom-4">
          <Button 
            size="lg" 
            className="shadow-xl min-w-[200px]"
            disabled={!selectedId}
            onClick={handleVote}
          >
            투표하기
          </Button>
        </div>
      )}
    </div>
  );
}
