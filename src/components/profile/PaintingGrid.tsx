'use client';

import { useState, useEffect } from 'react';
import { PaintingCard } from '@/components/feed/PaintingCard';
import type { Painting } from '@/types/database';

interface PaintingGridProps {
  userId: string;
}

export function PaintingGrid({ userId }: PaintingGridProps) {
  const [paintings, setPaintings] = useState<any[]>([]); // any for compatibility with PaintingCard props
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const res = await fetch(`/api/paintings?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setPaintings(data);
        }
      } catch (error) {
        console.error('Failed to fetch paintings', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaintings();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (paintings.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">아직 등록된 그림이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {paintings.map((painting) => (
        <div key={painting.id} className="h-full">
          <PaintingCard painting={painting} />
        </div>
      ))}
    </div>
  );
}
