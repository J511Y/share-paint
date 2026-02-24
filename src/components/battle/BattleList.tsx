'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { BattleListItem } from '@/types/api-contracts';
import { BattleArraySchema, BattleParticipantCountSchema } from '@/lib/validation/schemas';
import { parseJsonResponse } from '@/lib/validation/http';
import { BATTLE_LIST_FETCH_ERROR, BATTLE_RECOVERY_HINT } from './copy';

interface BattleListProps {
  initialBattles?: BattleListItem[];
  onCreateBattle?: () => void;
}

function getParticipantCount(participants: BattleListItem['participants']): number {
  if (!participants || participants.length === 0) {
    return 0;
  }

  const first = participants[0];
  const parsed = BattleParticipantCountSchema.safeParse(first);
  if (parsed.success) {
    return parsed.data.count;
  }

  return participants.length;
}

export function BattleList({ initialBattles = [], onCreateBattle }: BattleListProps) {
  const [battles, setBattles] = useState<BattleListItem[]>(initialBattles);
  const [loading, setLoading] = useState(!initialBattles.length);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchBattles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/battle?status=waiting');

      if (!res.ok) {
        setFetchError(BATTLE_LIST_FETCH_ERROR);
        return;
      }

      const data = await parseJsonResponse(res, BattleArraySchema);
      setBattles(data);
      setFetchError(null);
    } catch {
      setFetchError(BATTLE_LIST_FETCH_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
    // 정상 시 10초, 오류 시 30초 백오프로 폴링
    const intervalMs = fetchError ? 30000 : 10000;
    const interval = setInterval(fetchBattles, intervalMs);
    return () => clearInterval(interval);
  }, [fetchError]);

  if (loading && battles.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="space-y-3">
        {fetchError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>{fetchError}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-amber-700">자동 재시도 30초</span>
              <Button size="sm" variant="outline" onClick={fetchBattles} className="min-h-[36px]">
                다시 시도
              </Button>
            </div>
          </div>
        )}

        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h3 className="text-lg font-medium text-gray-900">진행 중인 대결이 없습니다</h3>
          <p className="text-gray-500 mt-1">새로운 대결방을 만들어보세요!</p>
          <p className="text-xs text-emerald-700 mt-2">
            게스트도 바로 참가할 수 있어요. 문제가 있으면 {BATTLE_RECOVERY_HINT}
          </p>
          {onCreateBattle && (
            <div className="mt-4">
              <Button onClick={onCreateBattle} variant="outline" size="sm">
                방 만들기
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fetchError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            <span>{fetchError}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-amber-700">자동 재시도 30초</span>
            <Button size="sm" variant="outline" onClick={fetchBattles} className="min-h-[36px]">
              다시 시도
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {battles.map((battle) => (
          <Card key={battle.id} className="hover:shadow-md transition-shadow">
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg text-gray-900 line-clamp-1">
                  {battle.title}
                </h3>
                {battle.is_private && <Lock className="w-4 h-4 text-gray-400" />}
              </div>

              <div className="flex gap-2 text-sm text-gray-600">
                <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded text-xs font-medium">
                  {battle.time_limit === 0 ? '무제한' : `${Math.floor(battle.time_limit / 60)}분`}
                </span>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                  {battle.topic || '랜덤 주제'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>
                    {Array.isArray(battle.participants) && battle.participants[0] && 'count' in battle.participants[0]
                      ? getParticipantCount(battle.participants)
                      : 1}
                    {' / '}
                    {battle.max_participants}
                  </span>
                </div>
                <Link href={`/battle/${battle.id}`}>
                  <Button size="sm" variant="outline" className="h-8">
                    참가하기
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
