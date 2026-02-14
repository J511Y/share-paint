'use client';

import { useState } from 'react';
import { RefreshCw, Lock, Unlock, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ApiTopic, ApiTopicSchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';

interface RandomTopicSelectorProps {
  onTopicSelect: (topic: string) => void;
  className?: string;
}

export function RandomTopicSelector({ onTopicSelect, className }: RandomTopicSelectorProps) {
  const [currentTopic, setCurrentTopic] = useState<ApiTopic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const fetchRandomTopic = async () => {
    if (isLocked) return;
    
      setIsLoading(true);
      try {
        const res = await fetch('/api/topics/random');
        if (res.ok) {
          const topic = await parseJsonResponse(res, ApiTopicSchema);
          setCurrentTopic(topic);
          onTopicSelect(topic.content);
        }
    } catch (error) {
      console.error('Failed to fetch random topic', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-sm p-4", className)}>
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Shuffle className="w-4 h-4" />
        오늘의 주제
      </h2>
      
      <div className="flex flex-col gap-3">
        <div className={cn(
          "min-h-[60px] flex flex-col items-center justify-center p-3 rounded-md border-2 border-dashed transition-colors text-center",
          currentTopic ? "border-purple-200 bg-purple-50" : "border-gray-200 bg-gray-50"
        )}>
          {currentTopic ? (
            <>
              <span className="text-sm font-medium text-purple-900 break-keep">
                {currentTopic.content}
              </span>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-1.5 py-0.5 bg-white rounded text-purple-600 border border-purple-100">
                  {currentTopic.category}
                </span>
                <span className={cn(
                  "text-xs px-1.5 py-0.5 bg-white rounded border",
                  currentTopic.difficulty === 'easy' ? "text-green-600 border-green-100" :
                  currentTopic.difficulty === 'hard' ? "text-red-600 border-red-100" :
                  "text-blue-600 border-blue-100"
                )}>
                  {currentTopic.difficulty}
                </span>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-400">
              무엇을 그릴지 고민되시나요?
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={fetchRandomTopic} 
            disabled={isLoading || isLocked}
            className="flex-1"
            size="sm"
            leftIcon={<RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />}
          >
            {currentTopic ? '다른 주제 뽑기' : '주제 뽑기'}
          </Button>
          
          {currentTopic && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLock}
              className={cn("w-10 px-0", isLocked && "bg-gray-100 text-gray-500")}
              title={isLocked ? "주제 잠금 해제" : "주제 고정"}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
