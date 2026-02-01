'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Clock, Lock, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import type { Battle } from '@/types/database';

interface BattleListProps {
  initialBattles?: Battle[];
}

export function BattleList({ initialBattles = [] }: BattleListProps) {
  const [battles, setBattles] = useState<Battle[]>(initialBattles);
  const [loading, setLoading] = useState(!initialBattles.length);

  const fetchBattles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/battle?status=waiting');
      if (res.ok) {
        const data = await res.json();
        setBattles(data);
      }
    } catch (error) {
      console.error('Failed to fetch battles', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattles();
    // 폴링으로 목록 갱신 (10초마다)
    const interval = setInterval(fetchBattles, 10000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <h3 className="text-lg font-medium text-gray-900">진행 중인 대결이 없습니다</h3>
        <p className="text-gray-500 mt-1">새로운 대결방을 만들어보세요!</p>
      </div>
    );
  }

  return (
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
                  {/* @ts-ignore: participants count from join */}
                  {battle.participants?.[0]?.count || 1} / {battle.max_participants}
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
  );
}
